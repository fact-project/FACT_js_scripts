'use strict';


function makeCurrentCalibration()
{
    dim.send("BIAS_CONTROL/SET_ZERO_VOLTAGE");
    dim.wait("BIAS_CONTROL", "VoltageOff", 30000); // waS: 15000

    var now = new Date();
    dim.send("FEEDBACK/CALIBRATE");

    console.out("Wait for calibration to start");
    dim.wait("FEEDBACK", "Calibrating", 5000);

    console.out("Wait for calibration to end");
    dim.wait("FEEDBACK", "Calibrated", 90000);

    console.out("Calibration finished ["+(new Date()-now)+"ms]");

    console.out("Wait for voltage to be off");
    dim.wait("BIAS_CONTROL", "VoltageOff", 30000); // was: 15000
}

function do_bias_calibration_if_needed()
{
    // Check age of calibration
    var service_calibration = new Subscription("FEEDBACK/CALIBRATION");

    var data_calibration = service_calibration.get(3000, false);

    var age = data_calibration.time;
    var now = new Date();

    var diff = (now-age)/3600000;

    var fb_state = dim.state("FEEDBACK").index;

    // !data_calibration.data: FEEDBACK might just be freshly
    // started and will not yet serve this service.
    if (fb_state<5 || (diff>8 && now.getHours()>16))
    {
        if (fb_state<5)
            console.out("No BIAS crate calibration available: New calibration needed.");
        else
            console.out("Last BIAS crate calibration taken at "+age.toUTCString()+": New calibration needed.");

        makeCurrentCalibration();
    }

    service_calibration.close();

}
