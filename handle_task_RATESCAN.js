'use strict';

function stop_drive_workaround(){
    // This is a workaround to make sure that we really catch
    // the new OnTrack state later and not the old one
    dim.send("DRIVE_CONTROL/STOP");
    dim.wait("DRIVE_CONTROL", "Initialized", 15000);
}


function start_tracking_and_wait(obs){
    if (obs.source != null)
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

function take_a_single_pedestal_run(irq){
    while (!irq)
    {
        if (irq || !takeRun("pedestal", 1000))
            continue;
        break;
    }
}

function handle_task_RATESCAN(service_feedback, obs, irq){
    var tm1 = new Date();
    stop_drive_workaround();
    OpenLid();
    service_feedback.voltageOn(0);
    start_tracking_and_wait(obs);
    service_feedback.voltageOn();
    service_feedback.waitForVoltageOn(irq);

    if (irq) return;
    dim.log("Starting calibration.");
    take_a_single_pedestal_run(irq);
    if (irq) return;

    var tm2 = new Date();
    dim.log("Starting ratescan.");
    dim.send("RATE_SCAN/SET_REFERENCE_CAMERA");
    dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 50, 1000, -10, "default");
    dim.wait("RATE_SCAN", "InProgress", 10000);
    dim.wait("RATE_SCAN", "Connected", 2700000);
    dim.log("Ratescan done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));

}