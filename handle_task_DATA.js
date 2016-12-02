'use strict';

function should_pointing_position_be_changed(current_observation, sub, run, remaining){
    // Changine pointing position and take calibration...
    //  ...every four runs (every ~20min)
    //  ...if at least ten minutes of observation time are left
    //  ...if this is the first run on the source

    return( run==0
        || (run%4==0
            && remaining>10
            && !current_observation[sub].orbit
           ));
}

function should_a_drs_calib_be_taken(diff, run, remaining){
    // Take DRS Calib...
    //  ...every four runs (every ~20min)
    //  ...at last  every two hours
    //  ...when DRS temperature has changed by more than 2deg (?)
    //  ...when more than 15min of observation are left
    //  ...no drs calibration was done yet
    return (
        diff == null
        || (
            run%4==0
            && (
                remaining > 15
                && diff > 70
               )
           )
        );
}

function calc_wobble_position(run){
    // start with alternating wobble positions each day
    return (parseInt(run/4) + parseInt(new Date()/1000/3600/24-0.5))%2+1;
}

function change_pointing_position(service_feedback, run, current_observation){
    // I think, this means, reduce by -1.1V which is clear from the call right?
    service_feedback.voltageOn(0);

    var wobble = calc_wobble_position(run);
    var angle  = current_observation[sub].angle == null ? Math.random()*360 : current_observation[sub].angle;

    // This is a workaround to make sure that we really catch
    // the new OnTrack state later and not the old one
    dim.send("DRIVE_CONTROL/STOP");
    dim.wait("DRIVE_CONTROL", "Initialized", 15000);

    if (current_observation[sub].orbit){
        dim.log("Pointing telescope to '"+current_observation[sub].source+"' [orbit="+current_observation[sub].orbit+"min, angle="+angle+"]");
        dim.send("DRIVE_CONTROL/TRACK_ORBIT", angle, current_observation[sub].orbit, current_observation[sub].source);
    }
    else{
        dim.log("Pointing telescope to '"+current_observation[sub].source+"' [wobble="+wobble+"]");
        dim.send("DRIVE_CONTROL/TRACK_WOBBLE", wobble, current_observation[sub].source);
    }
}

function is_current_too_high(){
    // Now check the current... (do not start a lot of stuff just to do nothing)
    var state = dim.state("FEEDBACK").name;
    reutrn (state=="Warning" || state=="Critical" || state=="OnStandby");
}


function if_pointing_changed_do_calibration(point, irq){
    if (!irq && point)
    {
        dim.log("Starting calibration.");
        while (!irq)
        {
            if (takeRun("pedestal", 1000))
                break;
        }
    }
}

function take_5minutes_data(irq){
    if (Sun.horizon(-16).isUp)
    {
        for (var i=0; i<5 && !irq; i++)
            takeRun("data", -1, 60); // Take data (1min)
    }
    else
    {
        var len = 300;
        while (!irq && len>15)
        {
            var time = new Date();
            if (takeRun("data", -1, len)) // Take data (5min)
                break;

            len -= parseInt((new Date()-time)/1000);
        }
    }

}

function handle_task_DATA(service_feedback, current_observation, next_observation, run, sub, irq){
    var remaining = next_observation==undefined ? 0 : (next_observation.start-new Date())/60000;
    dim.log("Run count "+run+" [remaining "+parseInt(remaining)+"min]");
    var diff = getTimeSinceLastDrsCalib(); // in minutes
    var point = should_pointing_position_be_changed(current_observation, sub, run, remaining);
    var drscal = should_a_drs_calib_be_taken(diff, run, remaining);

    if (point) change_pointing_position(service_feedback, run, current_observation);
    if (drscal) doDrsCalibration(irq, "data");  // will turn voltage off
    if (irq) return;
    OpenLid();
    // This is now th right time to wait for th drive to be stable
    dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing

    if (is_current_too_high()){
        v8.sleep(60000);
        return;
    }

    // Now we are 'OnTrack', so we can ramp to nominal voltage
    // and wait for the feedback to get stable
    service_feedback.voltageOn();
    service_feedback.waitForVoltageOn(irq);
    if_pointing_changed_do_calibration(point, irq);
    if (irq) return;
    take_5minutes_data(irq);
}

