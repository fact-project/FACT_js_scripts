'use strict';

console.out("");
dim.alarm();

var loop;
include("scripts/Handler.js");
include("scripts/CheckStates.js");

// -----------------------------------------------------------------
// Make sure camera electronics is switched on and has power
// -----------------------------------------------------------------

include("scripts/handleAgilentPowerOn24V.js");
include("scripts/handleAgilentPowerOn50V.js");
include("scripts/handleAgilentPowerOn80V.js");
include("scripts/handlePwrCameraOn.js");

checkSend(["AGILENT_CONTROL_24V","AGILENT_CONTROL_50V","AGILENT_CONTROL_80V","PWR_CONTROL"]);

loop = new Handler("PowerOn");
//loop.add(handleAgilentPowerOn24V);
//loop.add(handleAgilentPowerOn50V);
//loop.add(handleAgilentPowerOn80V);
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
include("scripts/CheckFTU.js");
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

include('scripts/CheckUnderflow.js');


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
// [ "LID_CONTROL",         [ "Open", "Closed"                  ] ],
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
