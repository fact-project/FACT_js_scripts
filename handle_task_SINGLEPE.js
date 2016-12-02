'use strict';

function do_drs_calibration_if_necessary(){
    // Check if DRS calibration is necessary
    var diff = getTimeSinceLastDrsCalib();
    if (diff>30 || diff==null)
    {
        doDrsCalibration("singlepe");
    }
}

function handle_task_SINGLEPE(service_feedback, irq){
    CloseLid();
    do_drs_calibration_if_necessary(); // will turn voltage off
    if (irq) return;
    service_feedback.voltageOn();
    service_feedback.waitForVoltageOn(irq);
    dim.log("Taking single p.e. run.");
    while (!irq && !takeRun("single-pe", 10000));
    service_feedback.voltageOff();
}

