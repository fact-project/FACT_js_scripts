'use strict';

function do_power_on_drive(){
    // ================================================================
    // Power on drive system if power is off (do it hre to make sure not
    // everything is switchd on at the same time)
    // ================================================================


    if ((dim.state("PWR_CONTROL").index&16)==0)
    {
        console.out("Drive cabinet not powered... Switching on.");
        dim.send("PWR_CONTROL/TOGGLE_DRIVE");
        v8.timeout(5000, function() { if (dim.state("PWR_CONTROL").index&16) return true; });
    }

    checkSend(["DRIVE_CONTROL"]);
    var loop = new Handler("ArmDrive");
    loop.add(handleDriveArmed);
    loop.run();
}
