'use strict';

function Shutdown(service_feedback, irq, type)
{
    if (!type)
        type = "default";

    dim.log("Starting shutdown ["+type+"].");

    var now1 = new Date();

    var bias = dim.state("BIAS_CONTROL").name;
    if (bias=="VoltageOn" || bias=="Ramping")
        service_feedback.voltageOn(0);

    CloseLid();

    var now2 = new Date();

    dim.send("DRIVE_CONTROL/PARK");

    console.out("","Waiting for telescope to park. This may take a while.");


    //take single pe run if required
    if (type=="singlepe")
    {
        dim.log("Taking single-pe run.");

        // The voltage must be on
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // Before we can switch to 3000 we have to make the right DRS calibration
        dim.log("Taking single p.e. run.");
        while (!irq && !takeRun("single-pe", 10000));

    }

    //wait until drive is in locked (after it reached park position)
    dim.wait("DRIVE_CONTROL", "Locked", 150000);

    //unlock drive if task was sleep
    if (type=="sleep")
        dim.send("DRIVE_CONTROL/UNLOCK");


    // It is unclear what comes next, so we better switch off the voltage
    service_feedback.voltageOff();

    dim.log("Finishing shutdown.");

    var now3 = new Date();

    dim.send("FTM_CONTROL/STOP_TRIGGER");
    dim.wait("FTM_CONTROL",  "Valid",        3000);

    if (bias!="Disconnected")
        dim.wait("FEEDBACK", "Calibrated",   3000);

    if (type!="sleep")
    {
        dim.send("BIAS_CONTROL/DISCONNECT");

        var pwrctrl_state = dim.state("PWR_CONTROL").name;
        if (pwrctrl_state=="SystemOn" ||
            pwrctrl_state=="BiasOff"  ||
            pwrctrl_state=="DriveOn")
            dim.send("PWR_CONTROL/TOGGLE_DRIVE");

        dim.wait("BIAS_CONTROL", "Disconnected", 3000);
        dim.wait("PWR_CONTROL",  "DriveOff",     6000);
    }

    var sub = new Subscription("DRIVE_CONTROL/POINTING_POSITION");
    sub.get(5000);  // FIXME: Proper error message in case of failure

    var report = sub.get();

    console.out("");
    console.out("Shutdown procedure ["+type+"] seems to be finished...");
    console.out("  "+new Date().toUTCString());
    console.out("  Telescope at Zd=%.1fdeg Az=%.1fdeg".$(report.obj['Zd'], report.obj['Az']));
    console.out("  Please check on the web cam that the park position was reached");
    console.out("  and the telescope is not moving anymore.");
    console.out("  Please check visually that the lid is really closed and");
    console.out("  that the biasctrl really switched the voltage off.", "");
    console.out("    DRIVE_CONTROL: "+dim.state("DRIVE_CONTROL").name);
    console.out("    FEEDBACK:      "+dim.state("FEEDBACK").name);
    console.out("    FTM_CONTROL:   "+dim.state("FTM_CONTROL").name);
    console.out("    BIAS_CONTROL:  "+dim.state("BIAS_CONTROL").name);
    console.out("    PWR_CONTROL:   "+dim.state("PWR_CONTROL").name);
    console.out("");
    dim.log("Shutdown: end ["+(now2-now1)/1000+"s, "+(now3-now2)/1000+"s, "+(new Date()-now3)/1000+"s]");
    console.out("");

    sub.close();
}

