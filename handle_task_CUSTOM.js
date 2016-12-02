'use strict';

function work_around_for_drive(){
    // This is a workaround to make sure that we really catch
    // the new OnTrack state later and not the old one
    dim.send("DRIVE_CONTROL/STOP");
    dim.wait("DRIVE_CONTROL", "Initialized", 15000);

}

function move_to_position(zd, az){
    // Move to position (zd/az)
    dim.log("Moving telescope to zd="+zd+" az="+az);
    dim.send("DRIVE_CONTROL/MOVE_TO", zd, az);
    v8.sleep(3000);
    dim.wait("DRIVE_CONTROL", "Initialized", 150000); // 110s for turning and 30s for stabilizing

}

function ramp_bias_if_needed(biason, service_feedback){
    // Ramp bias if needed
    if (!biason)
        service_feedback.voltageOff();
    else
    {
        // Switch the voltage to a reduced level (Ubd)
        var bias = dim.state("BIAS_CONTROL").name;
        if (bias=="VoltageOn" || bias=="Ramping")
            service_feedback.voltageOn(0);
    }
}

function take_custom_run(current_observation){
    dim.log("Taking custom run with time "+obs.time+"s, threshold="+obs.threshold+", biason="+obs.biason);
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
        dim.send("FTM_CONTROL/SET_THRESHOLD", -1, obs.threshold);
        v8.sleep(500);//wait that configuration is set
        dim.send("FTM_CONTROL/START_TRIGGER");
        dim.wait("FTM_CONTROL", "TriggerOn", 15000);
    }

    takeRun("custom", -1, obs.time, customRun);
}

function handle_task_CUSTOM(obs, service_feedback){
    work_around_for_drive();
    ramp_bias_if_needed(obs.biason, service_feedback);
    CloseLid();
    move_to_position(obs.zd, obs.az);
    if (obs.biason)
    {
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);
    }

    if (!irq) take_custom_run(obs);
}
