'use strict';

console.out("");
dim.alarm();

var loop;
include("scripts/Handler.js");
include("scripts/CheckStates.js");

// -----------------------------------------------------------------
// Make sure camera electronics is switched on and has power
// -----------------------------------------------------------------
include("scripts/handlePwrCameraOn.js");
checkSend(["PWR_CONTROL"]);
loop = new Handler("PowerOn");
loop.add(handlePwrCameraOn);
loop.run();
console.out("");

// -----------------------------------------------------------------
// Now take care that the bias control, the ftm and the fsc are
// properly connected and are in a reasonable state (e.g. the
// trigger is switched off)
// -----------------------------------------------------------------

include("scripts/handleBiasVoltageOff.js");
include("scripts/handleFtmIdle.js");
include("scripts/handleFscConnected.js");
include("scripts/handleFeedbackConnected.js");
include("scripts/handleRatectrlConnected.js");
include("scripts/handleLidClosed.js");
include("scripts/handleFadConnected.js");

checkSend(["BIAS_CONTROL","FAD_CONTROL","FTM_CONTROL", "FSC_CONTROL", "FEEDBACK", "RATE_CONTROL", "MCP"]);

dim.send("MCP/RESET");

loop = new Handler("SystemSetup");
loop.add(handleBiasVoltageOff);
loop.add(handleFtmIdle);
loop.add(handleFscConnected);
loop.add(handleFadConnected);
loop.add(handleFeedbackConnected); // Feedback needs FAD to be Connected
loop.add(handleRatectrlConnected);
//loop.add(handleLidClosed);
loop.run();

console.out("biasctrl:    "+dim.state("BIAS_CONTROL").name);
console.out("ftmctrl:     "+dim.state("FTM_CONTROL").name);
console.out("fscctrl:     "+dim.state("FSC_CONTROL").name);
console.out("feedback:    "+dim.state("FEEDBACK").name);
console.out("ratecontrol: "+dim.state("RATE_CONTROL").name);
console.out("fadctrl:     "+dim.state("FAD_CONTROL").name);
console.out("mcp:         "+dim.state("MCP").name);
console.out("");

console.out("Enable all FTU");
dim.send("FTM_CONTROL/ENABLE_FTU", -1, true);

// -----------------------------------------------------------------
// Now we check the FTU connection
// -----------------------------------------------------------------

console.out("Checking FTU: start");
var service_ftm = new Subscription("FTM_CONTROL/FTU_LIST");

// Make sure that we receive a 'Yes, we are connected and names are available' event
service_ftm.get(5000);

// Check for all FTUs to be connected when the next event arrives
service_ftm.onchange = function(event)
{
    var ping = event.obj['Ping'];
    for (var i=0; i<40; i++)
    {
        if (ping[i]==1)
            continue;

        var str = "";
        for (var h=0; h<4; h++)
        {
            for (var w=0; w<10; w++)
                str += ping[h*10+w];
            if (h!=3)
                str += '|';
        }

        console.out(str)

        console.out("Problems in the FTU communication found.");
        console.out("Send command to disable all FTUs.");
        console.out(" => Crate reset needed.");

        dim.send("FTM_CONTROL/ENABLE_FTU", -1, false);
        throw new Error("CrateReset[FTU]");
    }

    // Signal success by closing the connection
    service_ftm.close();
}

// Send ping (request FTU status)
dim.send("FTM_CONTROL/PING");

// Wait for 1 second for the answer
var timeout = new Thread(3000, function(){ if (service_ftm.isOpen) throw new Error("Could not check that all FTUs are ok within 3s."); });
while (service_ftm.isOpen)
    v8.sleep();


console.out("Checking FTU: done");
console.out("");

// -----------------------------------------------------------------
// Now we check the clock conditioner
// -----------------------------------------------------------------

var sub_counter = new Subscription("FTM_CONTROL/COUNTER");
var counter = sub_counter.get(3000, false).counter;
dim.send("FTM_CONTROL/REQUEST_STATIC_DATA");
v8.timeout(3000, function() { if (sub_counter.get(0, false).counter>counter) return true; });
if (sub_counter.get(0, false).qos&0x100==0)
    throw new Error("Clock conditioner not locked.");
sub_counter.close();

// ================================================================
// Underflow check
// ================================================================
// Is it necessary to check for the so called 'underflow-problem'?
// (This is necessary after each power cycle)
// ----------------------------------------------------------------


var Func = function() { };
Func.sum = function(a, b) { return a+b; }
Func.sq  = function(a, b) { return Math.sqrt(a*a + b*b); }
Func.min = function(a, b) { return Math.min(a, b); }
Func.max = function(a, b) { return Math.max(a, b); }
Func.avg = function(arr)  { return arr.reduce(Func.Sum, 0)/arr.length; }
Func.stat = function(arr, func)
{
    if (arr.length==0)
        return undefined;

    var sum = 0;
    var sq  = 0;
    var cnt = 0;
    var min = arr[0];
    var max = arr[0];
    arr.forEach(function(val, idx) { sum+=val; sq+=val*val; if (val>max) max=val; if (val<min) min=val; if (func && func(val, idx)) cnt++ });
    sum /= arr.length;
    sq  /= arr.length;

    return { avg:sum, rms:Math.sqrt(sq-sum*sum), min:min, max:max, count:cnt };
}

// ===================================================================

console.out(("\n%78s".$("")).replace(/ /g, "="));

if (dim.state("FTM_CONTROL").name=="TriggerOn")
{
    dim.send("FTM_CONTROL/STOP_TRIGGER");
    dim.wait("FTM_CONTROL", "Valid");
}


include('scripts/CheckStates.js');

var table =
[
 [ "MCP",                 [ "Idle"      ] ],
 [ "AGILENT_CONTROL_24V", [ "VoltageOn" ] ],
 [ "AGILENT_CONTROL_50V", [ "VoltageOn" ] ],
 [ "AGILENT_CONTROL_80V", [ "VoltageOn" ] ],
 [ "FTM_CONTROL",         [ "Valid"     ] ],
 [ "FAD_CONTROL",         [ "Connected",    "RunInProgress"   ] ],
 [ "BIAS_CONTROL",        [ "Disconnected", "VoltageOff"      ] ],
 [ "DATA_LOGGER",         [ "WaitForRun",   "NightlyFileOpen", "Logging" ] ],
];

console.out("Checking states.");
if (!checkStates(table))
{
    throw new Error("Something unexpected has happened. One of the servers",
            "is in a state in which it should not be. Please,",
            "try to find out what happened...");
}

// ===================================================================

include('scripts/Hist1D.js');
include('scripts/Hist2D.js');

console.out("Checking power on time");

var service_drs = new Subscription("FAD_CONTROL/DRS_RUNS");

var runs = service_drs.get(5000, false);
//if (!runs)
//    throw new Error("Could not connect to FAD_CONTROL/DRS_RUNS");

var power = dim.state("AGILENT_CONTROL_50V").time;
var now   = new Date();

var diff = (now-runs.time)/3600000;

console.out(" * Now:                "+now);
console.out(" * Last power cycle:   "+power);
console.out(" * Last DRS calib set: "+(runs.data?runs.time:"none"));


if (1)//diff>8 && now.getHours()>16 || runs.time<power)
{
    console.out("Checking send.");
    checkSend(["FAD_CONTROL", "MCP", "RATE_CONTROL"]);
    console.out("Checking send: done");

    //console.out("Most probablay the camera has not been checked for underflows yet.");

    var service_event = new Subscription("FAD_CONTROL/EVENT_DATA");

    dim.send("FAD_CONTROL/START_DRS_CALIBRATION");
    dim.send("FAD_CONTROL/SET_FILE_FORMAT", 0);

    var sub_runs = new Subscription("FAD_CONTROL/RUNS");
    var sruns = sub_runs.get(5000, false);

    if (dim.state("FAD_CONTROL").name=="RunInProgress" || sruns.qos==1)
    {
        dim.send("FAD_CONTROL/CLOSE_OPEN_FILES");
        dim.wait("FAD_CONTROL", "Connected", 3000);

        console.out("Waiting for open files to be closed...");
        v8.timeout(60000, function() { if (sub_runs.get(0, false).qos==0) return true; });

        // Although the file should be closed now, the processing might still be on-going
        // and delayed events might be received. The only fix for that issue is to
        // add the run number to the data we are waiting for
        v8.sleep(5000);
    }

    sub_runs.close();

    console.out("Starting drs-gain... waiting for new event");

    var sub_startrun = new Subscription("FAD_CONTROL/START_RUN");
    var sub_incomplete = new Subscription("FAD_CONTROL/INCOMPLETE");
    var sub_connections = new Subscription("FAD_CONTROL/CONNECTIONS");
    sub_connections.get(5000);
    sub_startrun.get(5000);

    var incomplete = 0;
    include('scripts/takeRun.js');
    sub_incomplete.onchange = FadIncomplete_onchange_function;

    while (1)
    {
        var event_counter = service_event.get(10000, false).counter;

        var stop = function ()
        {
            while (1)
            {
                if (dim.state("MCP").name=="TakingData" && service_event.get(0, false).counter>event_counter)
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

    sub_incomplete.close();
    sub_connections.close();
    sub_startrun.close();


    // FIXME: Restore DRS calibration in case of failure!!
    //        FAD Re-connect in case of failure?
    //        MCP/RESET in case of failure?
    //        Proper error reporting!

    var event = service_event.get(3000);//, false);
    service_event.close();

    console.out("Run stopped.");

    dim.send("RATE_CONTROL/STOP"); // GlobalThresholdSet -> Connected
    dim.wait("MCP", "Idle", 3000);

    var nn = runs.data && runs.data.length>0 && runs.obj['roi']>0 ? runs.obj['run'].reduce(Func.max) : -1;
    if (nn>0)
    {
        var night = runs.obj['night'];

        var yy =  night/10000;
        var mm = (night/100)%100;
        var dd =  night%100;

        var filefmt = "/loc_data/raw/%d/%02d/%02d/%8d_%03d.drs.fits";

        dim.log("Trying to restore last DRS calibration #"+nn+"  ["+runs.time+"; "+night+"]");

        // FIXME: Timeout
        var drs_counter = service_drs.get(0, false).counter;
        dim.send("FAD_CONTROL/LOAD_DRS_CALIBRATION", filefmt.$(yy, mm, dd, night, nn));

        try
        {
            var now = new Date();
            v8.timeout(3000, function() { if (service_drs.get(0, false).counter>drs_counter) return true; });
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

service_drs.close();



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

include("scripts/handleDriveArmed.js");

checkSend(["DRIVE_CONTROL"]);

loop = new Handler("ArmDrive");
loop.add(handleDriveArmed);
loop.run();


// ================================================================
// Bias crate calibration
// ================================================================
// Bias crate calibration if necessary (it is aftr 4pm (local tome)
// and the last calibration was more than eight hours ago.
// -----------------------------------------------------------------

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

// ================================================================
// Setup GPS control and wait for the satellites to be locked
// ================================================================

checkSend(["GPS_CONTROL"]);

if (dim.state("GPS_CONTROL").name=="Disconnected")
    dim.send("GPS_CONTROL/RECONNECT");

// Wait for being connectes
v8.timeout(5000, function() { if (dim.state("GPS_CONTROL").name!="Disconnected") return true; });

// Wait for status available
v8.timeout(5000, function() { if (dim.state("GPS_CONTROL").name!="Connected") return true; });

if (dim.state("GPS_CONTROL").name=="Disabled")
    dim.send("GPS_CONTROL/ENABLE");

dim.wait("GPS_CONTROL", "Locked", 15000);

// ================================================================
// Crosscheck all states
// ================================================================

var table =
[
 [ "TNG_WEATHER"   ],
 [ "MAGIC_WEATHER" ],
 [ "CHAT"          ],
 [ "SMART_FACT"    ],
 [ "TEMPERATURE"   ],
 [ "EVENT_SERVER",        [ "Running", "Standby" ] ],
 [ "DATA_LOGGER",         [ "NightlyFileOpen", "WaitForRun", "Logging" ] ],
 [ "FSC_CONTROL",         [ "Connected"                       ] ],
 [ "MCP",                 [ "Idle"                            ] ],
 [ "TIME_CHECK",          [ "Valid"                           ] ],
 [ "PWR_CONTROL",         [ "SystemOn"                        ] ],
 [ "AGILENT_CONTROL_24V", [ "VoltageOn"                       ] ],
 [ "AGILENT_CONTROL_50V", [ "VoltageOn"                       ] ],
 [ "AGILENT_CONTROL_80V", [ "VoltageOn"                       ] ],
 [ "BIAS_CONTROL",        [ "VoltageOff"                      ] ],
 [ "FEEDBACK",            [ "Calibrated"                      ] ],
 [ "RATE_SCAN",           [ "Connected"                       ] ],
 [ "RATE_CONTROL",        [ "Connected"                       ] ],
 [ "DRIVE_CONTROL",       [ "Initialized", "Tracking", "OnTrack", "Locked" ] ],
 [ "LID_CONTROL",         [ "Open", "Closed", "Inconsistent", "PowerProblem"  ] ],
 [ "FTM_CONTROL",         [ "Valid", "TriggerOn"              ] ],
 [ "FAD_CONTROL",         [ "Connected", "WritingData"        ] ],
 [ "GPS_CONTROL",         [ "Locked" ] ],
 [ "SQM_CONTROL",         [ "Valid" ] ],
 [ "PFMINI_CONTROL",      [ "Receiving" ] ],
];


if (!checkStates(table))
{
    throw new Error("Something unexpected has happened. Although the startup-"+
                    "procedure has finished, not all servers are in the state "+
                    "in which they ought to be. Please, try to find out what "+
                    "happened...");
}
