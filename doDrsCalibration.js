'use strict';

function doDrsCalibration(irq, where)
{
    dim.log("Starting DRS calibration ["+where+"]");

    service_feedback.voltageOff();

    var tm = new Date();

    while (!irq)
    {
        dim.send("FAD_CONTROL/START_DRS_CALIBRATION");
        if (irq || !takeRun("drs-pedestal", 1000))     // 40 / 20s     (50Hz)
            continue;

        if (irq || !takeRun("drs-gain",     1000))     // 40 / 20s     (50Hz)
            continue;

        if (where!="data")
        {
            if (irq || !takeRun("drs-pedestal", 1000))     // 40 / 20s     (50Hz)
                continue;
        }

        break;
    }

    if (where!="data")
    {
        dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

        while (!irq && !takeRun("drs-pedestal", 1000));     // 40 / 20s     (50Hz)
        while (!irq && !takeRun("drs-time",     1000));     // 40 / 20s     (50Hz)
    }

    while (!irq)
    {
        dim.send("FAD_CONTROL/RESET_SECONDARY_DRS_BASELINE");
        if (takeRun("pedestal",     1000))              // 40 / 10s     (80Hz)
            break;
    }

    dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

    while (!irq && !takeRun("pedestal",     1000));     // 40 / 10s     (80Hz)
    //                                                   -----------
    //                                                   4'40 / 2'00

    if (irq)
        dim.log("DRS calibration interrupted [%.1fs]".$((new Date()-tm)/1000));
    else
        dim.log("DRS calibration done [%.1fs]".$((new Date()-tm)/1000));
}