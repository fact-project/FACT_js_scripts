'use strict';


function reduce_voltage_or_off_as_required_by_obs(obs){
    if (obs.rstype=="dark-bias-off")
        service_feedback.voltageOff();
    else
    {
        // Switch the voltage to a reduced level (Ubd)
        var bias = dim.state("BIAS_CONTROL").name;
        if (bias=="VoltageOn" || bias=="Ramping")
            service_feedback.voltageOn(0);
    }
}

function voltage_on_as_required_by_obs(obs, service_feedback){
    if (obs.rstype != "dark-bias-off")
    {
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);
    }
}

function open_lid_if_required_by_obs(obs){
    if (obs.lidclosed)
        CloseLid();
    else
        OpenLid();
}

function setup_drive_as_needed_by_obs(obs){
    if (obs.lidclosed)
    {
        dim.log("Moving telescope to zd="+obs.zd+" az="+obs.az);
        dim.send("DRIVE_CONTROL/MOVE_TO", obs.zd, obs.az);
        v8.sleep(3000);
        dim.wait("DRIVE_CONTROL", "Initialized", 150000); // 110s for turning and 30s for stabilizing
    }
    else
    {
        if (obs.source != null)  // undefined != null -> false
        {
            dim.log("Pointing telescope to '"+obs.source+"'.");
            dim.send("DRIVE_CONTROL/TRACK_ON", obs.source);
        }
        else
        {
            dim.log("Pointing telescope to ra="+obs.ra+" dec="+obs.dec);
            dim.send("DRIVE_CONTROL/TRACK", obs.ra, obs.dec);
        }

        dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing
    }
}

function do_1st_ratescan_as_required_by_obs(obs, tm1){
    var tm2 = new Date();
    dim.log("Starting ratescan 2/1 ["+obs.rstype+"]");
    dim.send("RATE_SCAN/SET_REFERENCE_CAMERA");
    dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 50, 300, 20, obs.rstype);
    dim.wait("RATE_SCAN", "InProgress", 10000);
    dim.wait("RATE_SCAN", "Connected", 2700000);//45min
    dim.log("Ratescan 2/1 done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
}

function do_2nd_ratescan_as_required_by_obs(obs, tm1){
    var tm2 = new Date();
    dim.log("Starting ratescan 2/2 ["+obs.rstype+"]");
    dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 300, 1000, 100, obs.rstype);
    dim.wait("RATE_SCAN", "InProgress", 10000);
    dim.wait("RATE_SCAN", "Connected", 2700000);
    dim.log("Ratescan 2/2 done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
}

function handle_task_RATESCAN2(obs, service_feedback){
    var tm1 = new Date();
    stop_drive_workaround();
    reduce_voltage_or_off_as_required_by_obs(obs, service_feedback);
    open_lid_if_required_by_obs(obs);
    setup_drive_as_needed_by_obs(obs);
    voltage_on_as_required_by_obs(obs, service_feedback);
    if (irq) return;
    do_1st_ratescan_as_required_by_obs(obs, tm1);
    if (irq) return;
    do_2nd_ratescan_as_required_by_obs(obs, tm1);
}