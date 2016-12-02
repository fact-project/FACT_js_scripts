'use strict';
include('scripts/Observation_class.js');
include('scripts/getSchedule.js');
include("scripts/Handler.js");
include("scripts/CheckStates.js");
include("scripts/handlePwrCameraOn.js");
include("scripts/handleBiasVoltageOff.js");
include("scripts/handleFtmIdle.js");
include("scripts/handleFscConnected.js");
include("scripts/handleFeedbackConnected.js");
include("scripts/handleRatectrlConnected.js");
include("scripts/handleLidClosed.js");
include("scripts/handleFadConnected.js");
include("scripts/doSetupDaq.js");
include('scripts/Hist1D.js');
include('scripts/Hist2D.js');
include('scripts/takeRun.js');
include("scripts/handleDriveArmed.js");
include('scripts/doDrsCalibration.js');
include('scripts/lid_functions.js');
include('scripts/feedback.js');
include('scripts/shutdown.js');
include('scripts/datalogger.js');
include('scripts/doCheckFtuConnection.js');
include('scripts/Func.js');
include('scripts/print.js');
include('scripts/do_trigger_off_if_on.js');
include('scripts/check_states_early_not_sure_how_to_name_this.js');
include('scripts/check_power_on_time.js');
include('scripts/do_power_on_drive.js');
include('scripts/do_bias_calibration_if_needed.js');
include('scripts/do_assert_gps_is_locked.js');
include('scripts/getTimeSinceLastDrsCalib.js');

var irq;
include('scripts/irq_setting_functions.js');

/*
function is_sunrise(){
    var was_up_an_hour_ago = Sun.horizon("nautical", one_hour_ago).isUp;
    var is_up_now = Sun.horizon("nautical", now).isUp;
    return !was_up_an_hour_ago && is_up_now;
}
*/
var is_sunrise = (function () {
    var was_up_before = Sun.horizon("nautical").isUp;
    return function () {
        var is_up_now = Sun.horizon("nautical").isUp;
        var is_sunrise_ = !was_up_before && is_up_now;
        was_up_before = is_up_now;
        return is_sunrise_;
    }
})();

var has_obsersation_target_changed = (function () {
    var last_observation;
    return function (observation) {
        var has_changed = last_observation != observation;
        last_observation = observation;
        return has_changed;
    }
})();


dim.log("Start: "+__FILE__+" ["+__DATE__+"]");

// This should be set in dimctrl.rc as JavaScript.schedule-database.
// It is sent together with the script to the dimserver.
// If started directly, it has to be set after the command:
//
//   .js scripts/Main.js schedule-database=...
//
if (!$['schedule-database'])
    throw new Error("Environment 'schedule-database' not set!");


dim.onchange['FEEDBACK'] = reschedule_if_high_currents;
var service_feedback = Feedback();
var datalogger_subscriptions = Datalogger();

// ----------------------------------------------------------------
// Do a standard startup to bring the system in into a well
// defined state
// ----------------------------------------------------------------
console.out("");
dim.alarm();

doSwitchCameraPowerOn();
doSetupDaq();
doCheckFtuConnection();
doCheckClockConditioner();
print_line_of_equal_signs();
do_trigger_off_if_on();
check_states_early_not_sure_how_to_name_this();
check_power_on_time();
do_power_on_drive();
do_bias_calibration_if_needed();
do_assert_gps_is_locked();
check_states_later_before_data_taking_maybe();

var sub_counter = new Subscription("FTM_CONTROL/COUNTER");
sub_counter.onchange = monitor_clock_conditioner;


var sub_connections = new Subscription("FAD_CONTROL/CONNECTIONS");
var sub_startrun = new Subscription("FAD_CONTROL/START_RUN");
sub_startrun.get(5000);


var sub_incomplete = new Subscription("FAD_CONTROL/INCOMPLETE");
sub_incomplete.onchange = FadIncomplete_onchange_function;
checkSend(["MCP", "DRIVE_CONTROL", "LID_CONTROL", "FAD_CONTROL", "FEEDBACK"]);

service_feedback.get(5000);
dimctrl.setInterruptHandler(handleIrq);
dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

print_info_about_first_observation();

// ----------------------------------------------------------------
// Start main loop
// ----------------------------------------------------------------
dim.log("Entering main loop.");
console.out("");

var run = -2; // get_index_of_current_observation never called
var sub;
var nextId;
var system_on;  // undefined

while (!processIrq(service_feedback, irq))
{
    var current_observation = get_current_observation()
    var next_observation = get_next_observation()

    if (current_observation == undefined){
        v8.sleep(1000);
        continue;
    }

    // Check if observation position is still valid
    // If source position has changed, set run=0
    var idxObs = get_index_of_current_observation();
    if (idxObs===undefined)
        break;

    // we are still waiting for the first observation in the schedule
    if (idxObs==-1)
    {
        // flag that the first observation will be in the future
        run = -1;
        v8.sleep(1000);
        continue;
    }

    if (is_sunrise()){
        console.out("");
        dim.log("Sun rise detected.... automatic shutdown initiated!");
        // FIXME: State check?
        Shutdown(service_feedback, irq);
        system_on = false;
        continue;
    }

    if (has_obsersation_target_changed(current_observation))
    {
        dim.log("Starting new observation ["+current_observation.start.toUTCString()+", id="+current_observation.id+"]");
        sub = 0;
        if (run==-2){
            sub = current_observation.length-1;
        }
        run = 0;
    }


    if (next_observation && nextId!=next_observation.id)
    {
        dim.log("Next observation scheduled for "+next_observation.start.toUTCString()+" [id="+next_observation.id+"]");
        console.out("");
        nextId = next_observation.id;
    }

    if (!next_observation && nextId)
    {
        dim.log("No further observation scheduled.");
        console.out("");
        nextId = undefined;
    }

    if (sub>=current_observation.length)
    {
        v8.sleep(1000);
        continue;
    }

    if (system_on===false && current_observation[sub].task!="STARTUP")
    {
        v8.sleep(1000);
        continue;
    }

    // Check if sun is still up... only DATA and */
    if ((current_observation[sub].task=="DATA" || current_observation[sub].task=="RATESCAN" || current_observation[sub].task=="RATESCAN2" ) && Sun.horizon(-12).isUp)
    {
        var now = new Date();
        var remaining = (Sun.horizon(-12).set - now)/60000;
        console.out(now.toUTCString()+" - "+current_observation[sub].task+": Sun above FACT-horizon: sleeping 1min, remaining %.1fmin".$(remaining));
        v8.sleep(60000);
        continue;
    }


    if (current_observation[sub].task!="IDLE" && (current_observation[sub].task!="DATA" && run>0))
        dim.log("New task ["+current_observation[sub]+"]");

    // FIXME: Maybe print a warning if Drive is on during day time!

    // It is not ideal that we allow the drive to be on during day time, but
    // otherwise it is difficult to allow e.g. the STARTUP at the beginning of the night
    var power_states = Sun.horizon(-12).isUp || !system_on ? [ "DriveOff", "SystemOn" ] : [ "SystemOn" ];
    var drive_states = Sun.horizon(-12).isUp || !system_on ? undefined : [ "Initialized", "Tracking", "OnTrack" ];
    check_states_again(power_states, drive_states);

    datalogger_subscriptions.check();

    // Check if current_observation.task is one of the one-time-tasks
    switch (current_observation[sub].task)
    {
    case "IDLE":
        v8.sleep(5000);
        continue;

    case "SUSPEND":
    case "SLEEP":
        Shutdown(service_feedback, irq, "sleep"); //GoToSleep();

        dim.log("Task finished [SLEEP].");
        console.out("");
        sub++;
        continue;

    case "STARTUP":
        CloseLid();

        doDrsCalibration(irq, "startup");  // will switch the voltage off

        if (irq)
            break;

        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // Before we can switch to 3000 we have to make the right DRS calibration
        dim.log("Taking single p.e. run.");
        while (!irq && !takeRun("single-pe", 10000));

        // It is unclear what comes next, so we better switch off the voltage
        service_feedback.voltageOff();

        system_on = true;
        dim.log("Task finished [STARTUP]");
        console.out("");
        break;

    case "SHUTDOWN":
        Shutdown(service_feedback, irq, "singlepe");
        system_on = false;

        // FIXME: Avoid new observations after a shutdown until
        //        the next startup (set run back to -2?)
        sub++;
        dim.log("Task finished [SHUTDOWN]");
        console.out("");
        //console.out("  Waiting for next startup.", "");
        continue;

    case "DRSCALIB":
        doDrsCalibration(irq, "drscalib");  // will switch the voltage off
        dim.log("Task finished [DRSCALIB]");
        console.out("");
        break;

    case "SINGLEPE":
        // The lid must be closes
        CloseLid();

        // Check if DRS calibration is necessary
        var diff = getTimeSinceLastDrsCalib();
        if (diff>30 || diff==null)
        {
            doDrsCalibration("singlepe");  // will turn voltage off
            if (irq)
                break;
        }

        // The voltage must be on
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // Before we can switch to 3000 we have to make the right DRS calibration
        dim.log("Taking single p.e. run.");
        while (!irq && !takeRun("single-pe", 10000));

        // It is unclear what comes next, so we better switch off the voltage
        service_feedback.voltageOff();
        dim.log("Task finished [SINGLE-PE]");
        console.out("");
        break;

    case "OVTEST":
        var locked = dim.state("DRIVE_CONTROL").name=="Locked";
        if (!locked)
            dim.send("DRIVE_CONTROL/PARK");

        dim.send("FEEDBACK/STOP");

        // The lid must be closed
        CloseLid();

        if (!locked)
        {
            //console.out("Waiting for telescope to park. This may take a while.");
            dim.wait("DRIVE_CONTROL", "Locked", 3000);
            dim.send("DRIVE_CONTROL/UNLOCK");
        }

        // Check if DRS calibration is necessary
        var diff = getTimeSinceLastDrsCalib();
        if (diff>30 || diff==null)
        {
            doDrsCalibration(irq, "ovtest");  // will turn voltage off
            if (irq)
                break;
        }

        // The voltage must be on
        service_feedback.voltageOn(0.4);
        service_feedback.waitForVoltageOn(irq);

        dim.log("Taking single p.e. run (0.4V)");
        while (!irq && !takeRun("single-pe", 10000));

        for (var i=5; i<18 && !irq; i++)
        {
            dim.send("FEEDBACK/STOP");
            dim.wait("FEEDBACK", "Calibrated", 3000);
            dim.wait("BIAS_CONTROL", "VoltageOn", 3000);
            dim.send("FEEDBACK/START", i*0.1);
            dim.wait("FEEDBACK", "InProgress", 45000);
            dim.wait("BIAS_CONTROL", "VoltageOn", 60000); // FIXME: 30000?
            service_feedback.waitForVoltageOn(irq);
            dim.log("Taking single p.e. run ("+(i*0.1)+"V)");
            while (!irq && !takeRun("single-pe", 10000));
        }

        // It is unclear what comes next, so we better switch off the voltage
        service_feedback.voltageOff();
        dim.log("Task finished [OVTEST]");
        console.out("");
        break;

    case "RATESCAN":
        var tm1 = new Date();

        // This is a workaround to make sure that we really catch
        // the new OnTrack state later and not the old one
        dim.send("DRIVE_CONTROL/STOP");
        dim.wait("DRIVE_CONTROL", "Initialized", 15000);

        // The lid must be open
        OpenLid();

        // Switch the voltage to a reduced level (Ubd)
        service_feedback.voltageOn(0);

        if (current_observation[sub].source != null) // undefined != null -> false
        {
            dim.log("Pointing telescope to '"+current_observation[sub].source+"'.");
            dim.send("DRIVE_CONTROL/TRACK_ON", current_observation[sub].source);
        }
        else
        {
            dim.log("Pointing telescope to ra="+current_observation[sub].ra+" dec="+current_observation[sub].dec);
            dim.send("DRIVE_CONTROL/TRACK", current_observation[sub].ra, current_observation[sub].dec);
        }

        dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing

        // Now tracking stable, switch voltage to nominal level and wait
        // for stability.
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        if (!irq)
        {
            dim.log("Starting calibration.");

            // Calibration (2% of 20')
            while (!irq)
            {
                if (irq || !takeRun("pedestal",         1000))  // 80 Hz  -> 10s
                    continue;
                //if (irq || !takeRun("light-pulser-ext", 1000))  // 80 Hz  -> 10s
                //    continue;
                break;
            }

            var tm2 = new Date();

            dim.log("Starting ratescan.");

            //set reference to whole camera (in case it was changed)
            dim.send("RATE_SCAN/SET_REFERENCE_CAMERA");
            // Start rate scan
            dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 50, 1000, -10, "default");

            // Lets wait if the ratescan really starts... this might take a few
            // seconds because RATE_SCAN configures the ftm and is waiting for
            // it to be configured.
            dim.wait("RATE_SCAN", "InProgress", 10000);
            dim.wait("RATE_SCAN", "Connected", 2700000);

            // Here one could implement a watchdog for the feedback as well, but what is the difference
            // whether finally one has to find out if the feedback was in the correct state
            // or the ratescan was interrupted?

            // this line is actually some kind of hack.
            // after the Ratescan, no data is written to disk. I don't know why, but it happens all the time
            // So I decided to put this line here as a kind of patchwork....
            //dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

            dim.log("Ratescan done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
        }

        dim.log("Task finished [RATESCAN]");
        console.out("");
        break; // case "RATESCAN"

    case "RATESCAN2":
        var tm1 = new Date();

        // This is a workaround to make sure that we really catch
        // the new OnTrack state later and not the old one
        dim.send("DRIVE_CONTROL/STOP");
        dim.wait("DRIVE_CONTROL", "Initialized", 15000);

        if (current_observation[sub].rstype=="dark-bias-off")
            service_feedback.voltageOff();
        else
        {
            // Switch the voltage to a reduced level (Ubd)
            var bias = dim.state("BIAS_CONTROL").name;
            if (bias=="VoltageOn" || bias=="Ramping")
                service_feedback.voltageOn(0);
        }

        // Open the lid if required
        if (!current_observation[sub].lidclosed)
            OpenLid();
        else
            CloseLid();

        // track source/position or move to position
        if (current_observation[sub].lidclosed)
        {
            dim.log("Moving telescope to zd="+current_observation[sub].zd+" az="+current_observation[sub].az);
            dim.send("DRIVE_CONTROL/MOVE_TO", current_observation[sub].zd, current_observation[sub].az);
            v8.sleep(3000);
            dim.wait("DRIVE_CONTROL", "Initialized", 150000); // 110s for turning and 30s for stabilizing
        }
        else
        {
            if (current_observation[sub].source != null)  // undefined != null -> false
            {
                dim.log("Pointing telescope to '"+current_observation[sub].source+"'.");
                dim.send("DRIVE_CONTROL/TRACK_ON", current_observation[sub].source);
            }
            else
            {
                dim.log("Pointing telescope to ra="+current_observation[sub].ra+" dec="+current_observation[sub].dec);
                dim.send("DRIVE_CONTROL/TRACK", current_observation[sub].ra, current_observation[sub].dec);
            }

            dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing
        }

        // Now tracking stable, switch voltage to nominal level and wait
        // for stability.
        if (current_observation[sub].rstype!="dark-bias-off")
        {
            service_feedback.voltageOn();
            service_feedback.waitForVoltageOn(irq);
        }

        if (!irq)
        {
            var tm2 = new Date();

            dim.log("Starting ratescan 2/1 ["+current_observation[sub].rstype+"]");

            //set reference to whole camera (in case it was changed)
            dim.send("RATE_SCAN/SET_REFERENCE_CAMERA");
            // Start rate scan
            dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 50, 300, 20, current_observation[sub].rstype);

            // Lets wait if the ratescan really starts... this might take a few
            // seconds because RATE_SCAN configures the ftm and is waiting for
            // it to be configured.
            dim.wait("RATE_SCAN", "InProgress", 10000);
            //FIXME: discuss what best value is here
            dim.wait("RATE_SCAN", "Connected", 2700000);//45min
            //dim.wait("RATE_SCAN", "Connected", 1200000);//3.3h

            // Here one could implement a watchdog for the feedback as well, but what is the difference
            // whether finally one has to find out if the feedback was in the correct state
            // or the ratescan was interrupted?

            // this line is actually some kind of hack.
            // after the Ratescan, no data is written to disk. I don't know why, but it happens all the time
            // So I decided to put this line here as a kind of patchwork....
            //dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

            dim.log("Ratescan 2/1 done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
        }

        if (!irq)
        {
            var tm2 = new Date();

            dim.log("Starting ratescan 2/2 ["+current_observation[sub].rstype+"]");

            // Start rate scan
            dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 300, 1000, 100, current_observation[sub].rstype);

            // Lets wait if the ratescan really starts... this might take a few
            // seconds because RATE_SCAN configures the ftm and is waiting for
            // it to be configured.
            dim.wait("RATE_SCAN", "InProgress", 10000);
            dim.wait("RATE_SCAN", "Connected", 2700000);

            // Here one could implement a watchdog for the feedback as well, but what is the difference
            // whether finally one has to find out if the feedback was in the correct state
            // or the ratescan was interrupted?

            // this line is actually some kind of hack.
            // after the Ratescan, no data is written to disk. I don't know why, but it happens all the time
            // So I decided to put this line here as a kind of patchwork....
            //dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

            dim.log("Ratescan 2/2 done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
        }

        dim.log("Task finished [RATESCAN2]");
        console.out("");
        break; // case "RATESCAN2"

    case "CUSTOM":

        // This is a workaround to make sure that we really catch
        // the new OnTrack state later and not the old one
        dim.send("DRIVE_CONTROL/STOP");
        dim.wait("DRIVE_CONTROL", "Initialized", 15000);

        // Ramp bias if needed
        if (!current_observation[sub].biason)
            service_feedback.voltageOff();
        else
        {
            // Switch the voltage to a reduced level (Ubd)
            var bias = dim.state("BIAS_CONTROL").name;
            if (bias=="VoltageOn" || bias=="Ramping")
                service_feedback.voltageOn(0);
        }
        // Close lid
        CloseLid();

        // Move to position (zd/az)
        dim.log("Moving telescope to zd="+current_observation[sub].zd+" az="+current_observation[sub].az);
        dim.send("DRIVE_CONTROL/MOVE_TO", current_observation[sub].zd, current_observation[sub].az);
        v8.sleep(3000);
        dim.wait("DRIVE_CONTROL", "Initialized", 150000); // 110s for turning and 30s for stabilizing

        // Now tracking stable, switch voltage to nominal level and wait
        // for stability.
        if (current_observation[sub].biason)
        {
            service_feedback.voltageOn();
            service_feedback.waitForVoltageOn(irq);
        }

        if (!irq)
        {
            dim.log("Taking custom run with time "+current_observation[sub].time+"s, threshold="+current_observation[sub].threshold+", biason="+current_observation[sub].biason);

            var customRun = function()
            {
                v8.sleep(500);//wait that configuration is set
                dim.wait("FTM_CONTROL", "TriggerOn", 15000);
                dim.send("FAD_CONTROL/SEND_SINGLE_TRIGGER");
                dim.send("RATE_CONTROL/STOP");
                dim.send("FTM_CONTROL/STOP_TRIGGER");
                dim.wait("FTM_CONTROL", "Valid", 3000);
                dim.send("FTM_CONTROL/ENABLE_TRIGGER", true);
                dim.send("FTM_CONTROL/SET_TIME_MARKER_DELAY", 123);
                dim.send("FTM_CONTROL/SET_THRESHOLD", -1, current_observation[sub].threshold);
                v8.sleep(500);//wait that configuration is set
                dim.send("FTM_CONTROL/START_TRIGGER");
                dim.wait("FTM_CONTROL", "TriggerOn", 15000);
            }

            takeRun("custom", -1, current_observation[sub].time, customRun);
        }
        dim.log("Task finished [CUSTOM].");
        dim.log("");
        break; // case "CUSTOM"

    case "DATA":

        // ========================== case "DATA" ============================
        // Calculate remaining time for this observation in minutes
        var remaining = next_observation==undefined ? 0 : (next_observation.start-new Date())/60000;
        //dim.log("DEBUG: remaining: "+remaining+" next_observation="+next_observation+" start="+next_observation.start);

        // ------------------------------------------------------------

        dim.log("Run count "+run+" [remaining "+parseInt(remaining)+"min]");

        // ----- Time since last DRS Calibration [min] ------
        var diff = getTimeSinceLastDrsCalib();

        // Changine pointing position and take calibration...
        //  ...every four runs (every ~20min)
        //  ...if at least ten minutes of observation time are left
        //  ...if this is the first run on the source
        var point  = (run%4==0 && remaining>10 && !current_observation[sub].orbit) || run==0; // undefined==null -> true!

        // Take DRS Calib...
        //  ...every four runs (every ~20min)
        //  ...at last  every two hours
        //  ...when DRS temperature has changed by more than 2deg (?)
        //  ...when more than 15min of observation are left
        //  ...no drs calibration was done yet
        var drscal = (run%4==0 && (remaining>15 && diff>70)) || diff==null;

        if (point)
        {
            // Switch the voltage to a reduced voltage level
            service_feedback.voltageOn(0);

            // Change wobble position every four runs,
            // start with alternating wobble positions each day
            var wobble = (parseInt(run/4) + parseInt(new Date()/1000/3600/24-0.5))%2+1;
            var angle  = current_observation[sub].angle == null ? Math.random()*360 : current_observation[sub].angle;

            if (current_observation[sub].orbit) // != undefined, != null, != 0
                dim.log("Pointing telescope to '"+current_observation[sub].source+"' [orbit="+current_observation[sub].orbit+"min, angle="+angle+"]");
            else
                dim.log("Pointing telescope to '"+current_observation[sub].source+"' [wobble="+wobble+"]");

            // This is a workaround to make sure that we really catch
            // the new OnTrack state later and not the old one
            dim.send("DRIVE_CONTROL/STOP");
            dim.wait("DRIVE_CONTROL", "Initialized", 15000);

            if (current_observation[sub].orbit) // != undefined, != null, != 0
                dim.send("DRIVE_CONTROL/TRACK_ORBIT", angle, current_observation[sub].orbit, current_observation[sub].source);
            else
                dim.send("DRIVE_CONTROL/TRACK_WOBBLE", wobble, current_observation[sub].source);

            // Do we have to check if the telescope is really moving?
            // We can cross-check the SOURCE service later
        }

        if (drscal)
        {
            doDrsCalibration(irq, "data");  // will turn voltage off

            // Now we switch on the voltage and a significant amount of
            // time has been passed, so do the check again.
            if (!was_up && Sun.horizon(-12).isUp)
            {
                dim.log("Sun rise detected....");
                continue;
            }
        }

        if (irq)
            continue;

        OpenLid();

        // This is now th right time to wait for th drive to be stable
        dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing

        // Now check the voltage... (do not start a lot of stuff just to do nothing)
        var state = dim.state("FEEDBACK").name;
        if (state=="Warning" || state=="Critical" || state=="OnStandby")
        {
            v8.sleep(60000);
            continue;
        }

        // Now we are 'OnTrack', so we can ramp to nominal voltage
        // and wait for the feedback to get stable
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // If pointing had changed, do calibration
        if (!irq && point)
        {
            dim.log("Starting calibration.");

            // Calibration (2% of 20')
            while (!irq)
            {
                if (irq || !takeRun("pedestal",         1000))  // 80 Hz  -> 10s
                    continue;
                break;
            }
        }

        //console.out("  Taking data: start [5min]");

        // FIXME: What do we do if during calibration something has happened
        // e.g. drive went to ERROR? Maybe we have to check all states again?

        var twilight = Sun.horizon(-16).isUp;

        if (twilight)
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

        //console.out("  Taking data: done");
        run++;

        continue; // case "DATA"
    }

    if (next_observation!=undefined && sub==current_observation.length-1)
        dim.log("Next observation will start at "+next_observation.start.toUTCString()+" [id="+next_observation.id+"]");

    sub++;
}



dim.log("Left main loop [irq="+irq+"]");
