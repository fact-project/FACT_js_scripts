'use strict';

function park_if_not_locked_wait_and_unlock_again(){
    var locked = dim.state("DRIVE_CONTROL").name=="Locked";
    if (!locked)
    {
        dim.send("DRIVE_CONTROL/PARK");
        dim.wait("DRIVE_CONTROL", "Locked", 3000);
        dim.send("DRIVE_CONTROL/UNLOCK");
    }
}

function do_drs_calibration_if_necessary(irq){
    var diff = getTimeSinceLastDrsCalib();
    if (diff>30 || diff==null)
    {
        doDrsCalibration(irq, "ovtest");  // will turn voltage off
    }
}


function take_single_pe_runs_with_different_voltages(service_feedback, irq){
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
}

function handle_task_OVTEST(service_feedback, irq){
    dim.send("FEEDBACK/STOP");
    park_if_not_locked_wait_and_unlock_again();
    CloseLid();
    do_drs_calibration_if_necessary(irq)
    if (irq) return;
    service_feedback.voltageOn(0.4);
    service_feedback.waitForVoltageOn(irq);
    take_single_pe_runs_with_different_voltages(service_feedback, irq);
    service_feedback.voltageOff();
}

        dim.log("Task finished [OVTEST]");
        console.out("");
        break;
