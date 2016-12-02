'use strict';

function close_open_runs_if_needed(){
    var sruns = FadControl.get_runs(5000, false);

    if (dim.state("FAD_CONTROL").name=="RunInProgress" || sruns.qos==1)
    {
        dim.send("FAD_CONTROL/CLOSE_OPEN_FILES");
        dim.wait("FAD_CONTROL", "Connected", 3000);

        console.out("Waiting for open files to be closed...");
        v8.timeout(60000, function() { if (FadControl.get_runs(0, false).qos==0) return true; });

        // Although the file should be closed now, the processing might still be on-going
        // and delayed events might be received. The only fix for that issue is to
        // add the run number to the data we are waiting for
        v8.sleep(5000);
    }
}

function take_one_single_event(){

    console.out("Starting drs-gain... waiting for new event");
    var service_event = new Subscription("FAD_CONTROL/EVENT_DATA");
    while (1)
    {
        var event_counter = service_event.get(10000, false).counter;

        var stop = function ()
        {
            while (1)
            {
                if (dim.state("MCP").name=="TakingData"
                    && service_event.get(0, false).counter > event_counter
                    )
                {
                    dim.send("MCP/STOP");
                    console.out("Sent MCP/STOP.");
                    return;
                }
                v8.sleep(100);
            }
        }

        var thread = new Thread(250, stop);

        var rc = takeRun("drs-gain");

        thread.kill();

        if (rc)
            break;
    }

    console.out("Event received.");


    // FIXME: Restore DRS calibration in case of failure!!
    //        FAD Re-connect in case of failure?
    //        MCP/RESET in case of failure?
    //        Proper error reporting!

    var event = service_event.get(3000);//, false);
    service_event.close();


    console.out("Run stopped.");

    dim.send("RATE_CONTROL/STOP"); // GlobalThresholdSet -> Connected
    dim.wait("MCP", "Idle", 3000);

    return event;
}


function check_power_on_time(){
    console.out("Checking power on time");

    var runs = FadControl.get_drs_runs.get(5000, false);


    var power = dim.state("AGILENT_CONTROL_50V").time;
    var now   = new Date();

    var diff = (now - runs.time) / 3600000;

    console.out(" * Now:                "+now);
    console.out(" * Last power cycle:   "+power);
    console.out(" * Last DRS calib set: "+(runs.data?runs.time:"none"));
    console.out("Checking send.");
    checkSend(["FAD_CONTROL", "MCP", "RATE_CONTROL"]);
    console.out("Checking send: done");

    dim.send("FAD_CONTROL/START_DRS_CALIBRATION");
    dim.send("FAD_CONTROL/SET_FILE_FORMAT", 0);

    close_open_runs_if_needed();
    var event = take_one_single_event();

    var nn = runs.data && runs.data.length>0 && runs.obj['roi']>0 ? runs.obj['run'].reduce(Func.max) : -1;
    if (nn > 0)
    {
        var night = runs.obj['night'];

        var yy =  night/10000;
        var mm = (night/100)%100;
        var dd =  night%100;

        var filefmt = "/loc_data/raw/%d/%02d/%02d/%8d_%03d.drs.fits";

        dim.log("Trying to restore last DRS calibration #"+nn+"  ["+runs.time+"; "+night+"]");

        // FIXME: Timeout
        var drs_counter = FadControl.get_drs_runs(0, false).counter;
        dim.send("FAD_CONTROL/LOAD_DRS_CALIBRATION", filefmt.$(yy, mm, dd, night, nn));

        try
        {
            var now = new Date();
            v8.timeout(3000, function() { if (FadControl.get_drs_runs(0, false).counter > drs_counter) return true; });
            dim.log("Last DRS calibration restored ["+(new Date()-now)/1000+"s]");
        }
        catch (e)
        {
            console.warn("Restoring last DRS calibration failed.");
        }
    }

    var hist = Hist2D(16, -2048.5, 2048.5, 11, -10, 100);

    var data = event.obj;

    for (var i=0; i<1440; i++)
        hist.fill(data.avg[i], isNaN(data.rms[i])?-1:data.rms[i]);

    hist.print();

    var stat0 = Func.stat(data.avg, function(val, idx) { if (val<600) console.out(" PIX[hw="+idx+"]="+val); return val<600; });
    var stat1 = Func.stat(data.rms);

    console.out("Avg[min]=%.1f".$(stat0.min));
    console.out("Avg[avg]=%.1f +- %.1f".$(stat0.avg, stat0.rms));
    console.out("Avg[max]=%.1f".$(+stat0.max));
    console.out("Avg[cnt]="+stat0.count);
    console.out("");
    console.out("Rms[min]=%.1f".$(stat1.min));
    console.out("Rms[avg]=%.1f +- %.1f".$(stat1.avg, stat1.rms));
    console.out("Rms[max]=%.1f".$(stat1.max));
    console.out(("%78s\n".$("")).replace(/ /g, "="));

    //      OK                            UNDERFLOW
    // ------------------------------------------------------
    // Avg[min]=722.0                Avg[min]=-380.0
    // Avg[avg]=815.9 +- 45.9        Avg[avg]= 808.0 +- 102.0
    // Avg[max]=930.5                Avg[max]= 931.1
    // Avg[cnt]=0                    Avg[cnt]= 9

    // Rms[min]=14.0                 Rms[min]=13.9
    // Rms[avg]=16.5 +- 1.6          Rms[avg]=18.8 +- 26.8
    // Rms[max]=44.0                 Rms[max]=382.1

    if (stat0.count>0)
    {
        if (stat0.count>8)
            throw new Error("Underflow condition detected in about "+parseInt(stat0.count/9+.5)+" DRS.");

        console.warn("There is probably an underflow condition in one DRS... please check manually.");
    }
}

