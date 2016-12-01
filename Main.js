/**
 * @fileOverview This file has functions related to documenting JavaScript.
 * @author <a href="mailto:thomas.bretz@epfl.ch">Thomas Bretz</a>
 */
'use strict';
include('scripts/Observation_class.js');
include('scripts/getSchedule.js');
include("scripts/Handler.js");
include("scripts/CheckStates.js");
include("scripts/handlePwrCameraOn.js");
include("scripts/handleBiasVoltageOff.js");
include("scripts/handleFtmIdle.js");
include("scripts/handleFscConnected.js");
include("scripts/handleFeedbackConnected.js");
include("scripts/handleRatectrlConnected.js");
include("scripts/handleLidClosed.js");
include("scripts/handleFadConnected.js");
include("scripts/doSetupDaq.js");
include('scripts/Hist1D.js');
include('scripts/Hist2D.js');
include('scripts/takeRun.js');
include("scripts/handleDriveArmed.js");
include('scripts/doDrsCalibration.js');
include('scripts/lid_functions.js');
include('scripts/feedback.js');
include('scripts/shutdown.js');
include('scripts/datalogger.js');
include('scripts/doCheckFtuConnection.js');
include('scripts/Func.js');
include('scripts/print.js');
include('scripts/do_trigger_off_if_on.js');
include('scripts/check_states_early_not_sure_how_to_name_this.js');
include('scripts/check_power_on_time.js');


var irq;
include('scripts/irq_setting_functions.js');



dim.log("Start: "+__FILE__+" ["+__DATE__+"]");

// This should be set in dimctrl.rc as JavaScript.schedule-database.
// It is sent together with the script to the dimserver.
// If started directly, it has to be set after the command:
//
//   .js scripts/Main.js schedule-database=...
//
if (!$['schedule-database'])
    throw new Error("Environment 'schedule-database' not set!");

var observations = [ ];
dim.onchange['FEEDBACK'] = reschedule_if_high_currents;
var service_feedback = Feedback();
var datalogger_subscriptions = Datalogger();

// ----------------------------------------------------------------
// Do a standard startup to bring the system in into a well
// defined state
// ----------------------------------------------------------------
console.out("");
dim.alarm();

doSwitchCameraPowerOn();
doSetupDaq();
doCheckFtuConnection();
doCheckClockConditioner();

// ================================================================
// Underflow check
// ================================================================
// Is it necessary to check for the so called 'underflow-problem'?
// (This is necessary after each power cycle)
// ----------------------------------------------------------------


print_line_of_equal_signs();
do_trigger_off_if_on();
check_states_early_not_sure_how_to_name_this();
check_power_on_time();

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
var loop;
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


// ================================================================
//  Code to monitor clock conditioner
// ================================================================

var sub_counter = new Subscription("FTM_CONTROL/COUNTER");
sub_counter.onchange = function(evt)
{
    if (evt.qos>0 && evt.qos!=2 && evt.qos&0x100==0)
        throw new Error("FTM reports: clock conditioner not locked.");
}

// ================================================================
//  Code related to monitoring the fad system
// ================================================================

// This code is here, because scripts/Startup.js needs the
// same subscriptions... to be revised.
var sub_incomplete = new Subscription("FAD_CONTROL/INCOMPLETE");
var sub_connections = new Subscription("FAD_CONTROL/CONNECTIONS");
var sub_startrun = new Subscription("FAD_CONTROL/START_RUN");
sub_startrun.get(5000);

var incomplete = 0;

sub_incomplete.onchange = FadIncomplete_onchange_function;
// ----------------------------------------------------------------
// Check that everything we need is availabel to receive commands
// (FIXME: Should that go to the general CheckState?)
// ----------------------------------------------------------------
//console.out("Checking send.");
checkSend(["MCP", "DRIVE_CONTROL", "LID_CONTROL", "FAD_CONTROL", "FEEDBACK"]);
//console.out("Checking send: done");

// ----------------------------------------------------------------
// Bring feedback into the correct operational state
// ----------------------------------------------------------------
//console.out("Feedback init: start.");
service_feedback.get(5000);

// ----------------------------------------------------------------
// Connect to the DRS_RUNS service
// ----------------------------------------------------------------
//console.out("Drs runs init: start.");

var sub_drsruns = new Subscription("FAD_CONTROL/DRS_RUNS");
sub_drsruns.get(5000);
// FIXME: Check if the last DRS calibration was complete?

function getTimeSinceLastDrsCalib()
{
    // ----- Time since last DRS Calibration [min] ------
    var runs = sub_drsruns.get(0);
    var diff = (new Date()-runs.time)/60000;

    // Warning: 'roi=300' is a number which is not intrisically fixed
    //          but can change depending on the taste of the observers
    var valid = runs.obj['run'][2]>0 && runs.obj['roi']==300;

    if (valid)
        dim.log("Last DRS calibration was %.1fmin ago".$(diff));
    else
        dim.log("No valid DRS calibration available.");

    return valid ? diff : null;
}

// ----------------------------------------------------------------
// Install interrupt handler
// ----------------------------------------------------------------
function handleIrq(cmd, args, time, user)
{
    console.out("Interrupt received:");
    console.out("  IRQ:  "+cmd);
    console.out("  Time: "+time);
    console.out("  User: "+user);

    irq = cmd ? cmd : "stop";

    // This will end a run in progress as if it where correctly stopped
    if (dim.state("MCP").name=="TakingData")
        dim.send("MCP/STOP");

    // This will stop a rate scan in progress
    if (dim.state("RATE_SCAN").name=="InProgress")
        dim.send("RATE_SCAN/STOP");
}

dimctrl.setInterruptHandler(handleIrq);

// ----------------------------------------------------------------
// Make sure we will write files
// ----------------------------------------------------------------
dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

// ----------------------------------------------------------------
// Print some information for the user about the
// expected first oberservation
// ----------------------------------------------------------------
observations = getSchedule();
var test = get_index_of_current_observation(observations);
if (test!=undefined)
{
    var n = new Date();
    if (observations.length>0 && test==-1)
        dim.log("First observation scheduled for "+observations[0].start.toUTCString()+" [id="+observations[0].id+"]");
    if (test>=0 && test<observations.length)
        dim.log("First observation should start immediately ["+observations[test].start.toUTCString()+", id="+observations[test].id+"]");
    if (observations.length>0 && observations[0].start>n+12*3600*1000)
        dim.log("No observations scheduled for the next 12 hours!");
    if (observations.length==0)
        dim.log("No observations scheduled!");
}

// ----------------------------------------------------------------
// Start main loop
// ----------------------------------------------------------------
dim.log("Entering main loop.");
console.out("");

var run = -2; // get_index_of_current_observation never called
var sub;
var lastId;
var nextId;
var sun = Sun.horizon(-12);
var system_on;  // undefined

function processIrq()
{
    if (!irq)
        return false;

    if (irq.toUpperCase()=="RESCHEDULE")
    {
        irq = undefined;
        return false;
    }

    if (irq.toUpperCase()=="OFF")
    {
        service_feedback.voltageOff();
        dim.send("FAD_CONTROL/CLOSE_OPEN_FILES");
        return true;
    }

    /*
    if (irq.toUpperCase()=="STOP")
    {
        dim.send("FAD_CONTROL/CLOSE_OPEN_FILES");
        dim.send("MCP/STOP");
        return true;
    }*/

    if (irq.toUpperCase()=="SHUTDOWN")
    {
        Shutdown(service_feedback, irq);
        return true;
    }

    dim.log("IRQ "+irq+" unhandled... stopping script.");
    return true;
}

while (!processIrq())
{
    // Check if observation position is still valid
    // If source position has changed, set run=0
    observations = getSchedule();
    var idxObs = get_index_of_current_observation(observations);
    if (idxObs===undefined)
        break;

    // we are still waiting for the first observation in the schedule
    if (idxObs==-1)
    {
        // flag that the first observation will be in the future
        run = -1;
        v8.sleep(1000);
        continue;
    }

    // Check if we have to take action do to sun-rise
    var was_up = sun.isUp;
    sun = Sun.horizon(-12);
    if (!was_up && sun.isUp)
    {
        console.out("");
        dim.log("Sun rise detected.... automatic shutdown initiated!");
        // FIXME: State check?
        Shutdown(service_feedback, irq);
        system_on = false;
        continue;
    }

    // Current and next observation target
    var obs     = observations[idxObs];
    var nextObs = observations[idxObs+1];

    // Check if observation target has changed
    if (lastId!=obs.id) // !Object.isEqual(obs, nextObs)
    {
        dim.log("Starting new observation ["+obs.start.toUTCString()+", id="+obs.id+"]");

        // This is the first source, but we do not come from
        // a scheduled 'START', so we have to check if the
        // telescop is operational already
        sub = 0;
        if (run<0)
        {
            //Startup();   // -> Bias On/Off?, Lid open/closed?
            //CloseLid();
        }

        // The first observation had a start-time in the past...
        // In this particular case start with the last entry
        // in the list of measurements
        if (run==-2)
            sub = obs.length-1;

        run = 0;
        lastId = obs.id;
    }

    //dim.log("DEBUG: Next observation scheduled for "+nextObs.start.toUTCString()+" [id="+nextObs.id+"]");
    if (nextObs && nextId!=nextObs.id)
    {
        dim.log("Next observation scheduled for "+nextObs.start.toUTCString()+" [id="+nextObs.id+"]");
        console.out("");
        nextId = nextObs.id;
    }

    if (!nextObs && nextId)
    {
        dim.log("No further observation scheduled.");
        console.out("");
        nextId = undefined;
    }

    //if (nextObs==undefined && obs[obs.length-1].task!="SHUTDOWN")
    //    throw Error("Last scheduled measurement must be a shutdown.");

    // We are done with all measurement slots for this
    // observation... wait for next observation
    if (sub>=obs.length)
    {
        v8.sleep(1000);
        continue;
    }

    if (system_on===false && obs[sub].task!="STARTUP")
    {
        v8.sleep(1000);
        continue;
    }

    // Check if sun is still up... only DATA and */
    if ((obs[sub].task=="DATA" || obs[sub].task=="RATESCAN" || obs[sub].task=="RATESCAN2" ) && sun.isUp)
    {
        var now = new Date();
        var remaining = (sun.set - now)/60000;
        console.out(now.toUTCString()+" - "+obs[sub].task+": Sun above FACT-horizon: sleeping 1min, remaining %.1fmin".$(remaining));
        v8.sleep(60000);
        continue;
    }


    if (obs[sub].task!="IDLE" && (obs[sub].task!="DATA" && run>0))
        dim.log("New task ["+obs[sub]+"]");

    // FIXME: Maybe print a warning if Drive is on during day time!

    // It is not ideal that we allow the drive to be on during day time, but
    // otherwise it is difficult to allow e.g. the STARTUP at the beginning of the night
    var power_states = sun.isUp || !system_on ? [ "DriveOff", "SystemOn" ] : [ "SystemOn" ];
    var drive_states = sun.isUp || !system_on ? undefined : [ "Initialized", "Tracking", "OnTrack" ];

    // A scheduled task was found, lets check if all servers are
    // still only and in reasonable states. If this is not the case,
    // something unexpected must have happend and the script is aborted.
    //console.out("  Checking states [general]");
    var table =
        [
         [ "TNG_WEATHER"   ],
         [ "MAGIC_WEATHER" ],
         [ "CHAT"          ],
         [ "SMART_FACT"    ],
         [ "TEMPERATURE"   ],
         [ "DATA_LOGGER",         [ "NightlyFileOpen", "WaitForRun", "Logging" ] ],
         [ "FSC_CONTROL",         [ "Connected"                ] ],
         [ "MCP",                 [ "Idle"                     ] ],
         [ "TIME_CHECK",          [ "Valid"                    ] ],
         [ "PWR_CONTROL",         power_states/*[ "SystemOn"                 ]*/ ],
         [ "AGILENT_CONTROL_24V", [ "VoltageOn"                ] ],
         [ "AGILENT_CONTROL_50V", [ "VoltageOn"                ] ],
         [ "AGILENT_CONTROL_80V", [ "VoltageOn"                ] ],
         [ "BIAS_CONTROL",        [ "VoltageOff", "VoltageOn", "Ramping" ] ],
         [ "FEEDBACK",            [ "Calibrated", "InProgress", "OnStandby", "Warning", "Critical" ] ],
//         [ "LID_CONTROL",         [ "Open", "Closed"           ] ],
//         [ "LID_CONTROL",         [ "Open", "Closed", "Inconsistent"  ] ], HOTFIX because of connection problems with the lid arduino. See: https://www.fact-project.org/logbook/showthread.php?tid=4402&page=2
         [ "DRIVE_CONTROL",       drive_states/*[ "Armed", "Tracking", "OnTrack" ]*/ ],
         [ "FTM_CONTROL",         [ "Valid", "TriggerOn"       ] ],
         [ "FAD_CONTROL",         [ "Connected", "RunInProgress" ] ],
         [ "RATE_SCAN",           [ "Connected"                ] ],
         [ "RATE_CONTROL",        [ "Connected", "GlobalThresholdSet", "InProgress"  ] ],
         [ "GPS_CONTROL",         [ "Locked"  ] ],
         [ "SQM_CONTROL",         [ "Disconnected", "Connected", "Valid" ] ],
         [ "PFMINI_CONTROL",      [ "Disconnected", "Connected", "Receiving" ] ],
        ];


    if (!checkStates(table))
    {
        throw new Error("Something unexpected has happened. One of the servers "+
                        "is in a state in which it should not be. Please,"+
                        "try to find out what happened...");
    }

    datalogger_subscriptions.check();

    // If this is an observation which needs the voltage to be swicthed on
    // skip that if the voltage is not stable
    /*
    if (obs[sub].task=="DATA" || obs[sub].task=="RATESCAN")
    {
        var state = dim.state("FEEDBACK").name;
        if (state=="Warning" || state=="Critical" || state=="OnStandby")
        {
            v8.sleep(1000);
            continue;
        }
    }*/


    // Check if obs.task is one of the one-time-tasks
    switch (obs[sub].task)
    {
    case "IDLE":
        v8.sleep(5000);
        continue;

    case "SUSPEND":
    case "SLEEP":
        Shutdown(service_feedback, irq, "sleep"); //GoToSleep();

        dim.log("Task finished [SLEEP].");
        console.out("");
        sub++;
        continue;

    case "STARTUP":
        CloseLid();

        doDrsCalibration(irq, "startup");  // will switch the voltage off

        if (irq)
            break;

        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // Before we can switch to 3000 we have to make the right DRS calibration
        dim.log("Taking single p.e. run.");
        while (!irq && !takeRun("single-pe", 10000));

        // It is unclear what comes next, so we better switch off the voltage
        service_feedback.voltageOff();

        system_on = true;
        dim.log("Task finished [STARTUP]");
        console.out("");
        break;

    case "SHUTDOWN":
        Shutdown(service_feedback, irq, "singlepe");
        system_on = false;

        // FIXME: Avoid new observations after a shutdown until
        //        the next startup (set run back to -2?)
        sub++;
        dim.log("Task finished [SHUTDOWN]");
        console.out("");
        //console.out("  Waiting for next startup.", "");
        continue;

    case "DRSCALIB":
        doDrsCalibration(irq, "drscalib");  // will switch the voltage off
        dim.log("Task finished [DRSCALIB]");
        console.out("");
        break;

    case "SINGLEPE":
        // The lid must be closes
        CloseLid();

        // Check if DRS calibration is necessary
        var diff = getTimeSinceLastDrsCalib();
        if (diff>30 || diff==null)
        {
            doDrsCalibration("singlepe");  // will turn voltage off
            if (irq)
                break;
        }

        // The voltage must be on
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // Before we can switch to 3000 we have to make the right DRS calibration
        dim.log("Taking single p.e. run.");
        while (!irq && !takeRun("single-pe", 10000));

        // It is unclear what comes next, so we better switch off the voltage
        service_feedback.voltageOff();
        dim.log("Task finished [SINGLE-PE]");
        console.out("");
        break;

    case "OVTEST":
        var locked = dim.state("DRIVE_CONTROL").name=="Locked";
        if (!locked)
            dim.send("DRIVE_CONTROL/PARK");

        dim.send("FEEDBACK/STOP");

        // The lid must be closed
        CloseLid();

        if (!locked)
        {
            //console.out("Waiting for telescope to park. This may take a while.");
            dim.wait("DRIVE_CONTROL", "Locked", 3000);
            dim.send("DRIVE_CONTROL/UNLOCK");
        }

        // Check if DRS calibration is necessary
        var diff = getTimeSinceLastDrsCalib();
        if (diff>30 || diff==null)
        {
            doDrsCalibration(irq, "ovtest");  // will turn voltage off
            if (irq)
                break;
        }

        // The voltage must be on
        service_feedback.voltageOn(0.4);
        service_feedback.waitForVoltageOn(irq);

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

        // It is unclear what comes next, so we better switch off the voltage
        service_feedback.voltageOff();
        dim.log("Task finished [OVTEST]");
        console.out("");
        break;

    case "RATESCAN":
        var tm1 = new Date();

        // This is a workaround to make sure that we really catch
        // the new OnTrack state later and not the old one
        dim.send("DRIVE_CONTROL/STOP");
        dim.wait("DRIVE_CONTROL", "Initialized", 15000);

        // The lid must be open
        OpenLid();

        // Switch the voltage to a reduced level (Ubd)
        service_feedback.voltageOn(0);

        if (obs[sub].source != null) // undefined != null -> false
        {
            dim.log("Pointing telescope to '"+obs[sub].source+"'.");
            dim.send("DRIVE_CONTROL/TRACK_ON", obs[sub].source);
        }
        else
        {
            dim.log("Pointing telescope to ra="+obs[sub].ra+" dec="+obs[sub].dec);
            dim.send("DRIVE_CONTROL/TRACK", obs[sub].ra, obs[sub].dec);
        }

        dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing

        // Now tracking stable, switch voltage to nominal level and wait
        // for stability.
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        if (!irq)
        {
            dim.log("Starting calibration.");

            // Calibration (2% of 20')
            while (!irq)
            {
                if (irq || !takeRun("pedestal",         1000))  // 80 Hz  -> 10s
                    continue;
                //if (irq || !takeRun("light-pulser-ext", 1000))  // 80 Hz  -> 10s
                //    continue;
                break;
            }

            var tm2 = new Date();

            dim.log("Starting ratescan.");

            //set reference to whole camera (in case it was changed)
            dim.send("RATE_SCAN/SET_REFERENCE_CAMERA");
            // Start rate scan
            dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 50, 1000, -10, "default");

            // Lets wait if the ratescan really starts... this might take a few
            // seconds because RATE_SCAN configures the ftm and is waiting for
            // it to be configured.
            dim.wait("RATE_SCAN", "InProgress", 10000);
            dim.wait("RATE_SCAN", "Connected", 2700000);

            // Here one could implement a watchdog for the feedback as well, but what is the difference
            // whether finally one has to find out if the feedback was in the correct state
            // or the ratescan was interrupted?

            // this line is actually some kind of hack.
            // after the Ratescan, no data is written to disk. I don't know why, but it happens all the time
            // So I decided to put this line here as a kind of patchwork....
            //dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

            dim.log("Ratescan done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
        }

        dim.log("Task finished [RATESCAN]");
        console.out("");
        break; // case "RATESCAN"

    case "RATESCAN2":
        var tm1 = new Date();

        // This is a workaround to make sure that we really catch
        // the new OnTrack state later and not the old one
        dim.send("DRIVE_CONTROL/STOP");
        dim.wait("DRIVE_CONTROL", "Initialized", 15000);

        if (obs[sub].rstype=="dark-bias-off")
            service_feedback.voltageOff();
        else
        {
            // Switch the voltage to a reduced level (Ubd)
            var bias = dim.state("BIAS_CONTROL").name;
            if (bias=="VoltageOn" || bias=="Ramping")
                service_feedback.voltageOn(0);
        }

        // Open the lid if required
        if (!obs[sub].lidclosed)
            OpenLid();
        else
            CloseLid();

        // track source/position or move to position
        if (obs[sub].lidclosed)
        {
            dim.log("Moving telescope to zd="+obs[sub].zd+" az="+obs[sub].az);
            dim.send("DRIVE_CONTROL/MOVE_TO", obs[sub].zd, obs[sub].az);
            v8.sleep(3000);
            dim.wait("DRIVE_CONTROL", "Initialized", 150000); // 110s for turning and 30s for stabilizing
        }
        else
        {
            if (obs[sub].source != null)  // undefined != null -> false
            {
                dim.log("Pointing telescope to '"+obs[sub].source+"'.");
                dim.send("DRIVE_CONTROL/TRACK_ON", obs[sub].source);
            }
            else
            {
                dim.log("Pointing telescope to ra="+obs[sub].ra+" dec="+obs[sub].dec);
                dim.send("DRIVE_CONTROL/TRACK", obs[sub].ra, obs[sub].dec);
            }

            dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing
        }

        // Now tracking stable, switch voltage to nominal level and wait
        // for stability.
        if (obs[sub].rstype!="dark-bias-off")
        {
            service_feedback.voltageOn();
            service_feedback.waitForVoltageOn(irq);
        }

        if (!irq)
        {
            var tm2 = new Date();

            dim.log("Starting ratescan 2/1 ["+obs[sub].rstype+"]");

            //set reference to whole camera (in case it was changed)
            dim.send("RATE_SCAN/SET_REFERENCE_CAMERA");
            // Start rate scan
            dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 50, 300, 20, obs[sub].rstype);

            // Lets wait if the ratescan really starts... this might take a few
            // seconds because RATE_SCAN configures the ftm and is waiting for
            // it to be configured.
            dim.wait("RATE_SCAN", "InProgress", 10000);
            //FIXME: discuss what best value is here
            dim.wait("RATE_SCAN", "Connected", 2700000);//45min
            //dim.wait("RATE_SCAN", "Connected", 1200000);//3.3h

            // Here one could implement a watchdog for the feedback as well, but what is the difference
            // whether finally one has to find out if the feedback was in the correct state
            // or the ratescan was interrupted?

            // this line is actually some kind of hack.
            // after the Ratescan, no data is written to disk. I don't know why, but it happens all the time
            // So I decided to put this line here as a kind of patchwork....
            //dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

            dim.log("Ratescan 2/1 done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
        }

        if (!irq)
        {
            var tm2 = new Date();

            dim.log("Starting ratescan 2/2 ["+obs[sub].rstype+"]");

            // Start rate scan
            dim.send("RATE_SCAN/START_THRESHOLD_SCAN", 300, 1000, 100, obs[sub].rstype);

            // Lets wait if the ratescan really starts... this might take a few
            // seconds because RATE_SCAN configures the ftm and is waiting for
            // it to be configured.
            dim.wait("RATE_SCAN", "InProgress", 10000);
            dim.wait("RATE_SCAN", "Connected", 2700000);

            // Here one could implement a watchdog for the feedback as well, but what is the difference
            // whether finally one has to find out if the feedback was in the correct state
            // or the ratescan was interrupted?

            // this line is actually some kind of hack.
            // after the Ratescan, no data is written to disk. I don't know why, but it happens all the time
            // So I decided to put this line here as a kind of patchwork....
            //dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

            dim.log("Ratescan 2/2 done [%.1fs, %.1fs]".$((tm2-tm1)/1000, (new Date()-tm2)/1000));
        }

        dim.log("Task finished [RATESCAN2]");
        console.out("");
        break; // case "RATESCAN2"

    case "CUSTOM":

        // This is a workaround to make sure that we really catch
        // the new OnTrack state later and not the old one
        dim.send("DRIVE_CONTROL/STOP");
        dim.wait("DRIVE_CONTROL", "Initialized", 15000);

        // Ramp bias if needed
        if (!obs[sub].biason)
            service_feedback.voltageOff();
        else
        {
            // Switch the voltage to a reduced level (Ubd)
            var bias = dim.state("BIAS_CONTROL").name;
            if (bias=="VoltageOn" || bias=="Ramping")
                service_feedback.voltageOn(0);
        }
        // Close lid
        CloseLid();

        // Move to position (zd/az)
        dim.log("Moving telescope to zd="+obs[sub].zd+" az="+obs[sub].az);
        dim.send("DRIVE_CONTROL/MOVE_TO", obs[sub].zd, obs[sub].az);
        v8.sleep(3000);
        dim.wait("DRIVE_CONTROL", "Initialized", 150000); // 110s for turning and 30s for stabilizing

        // Now tracking stable, switch voltage to nominal level and wait
        // for stability.
        if (obs[sub].biason)
        {
            service_feedback.voltageOn();
            service_feedback.waitForVoltageOn(irq);
        }

        if (!irq)
        {
            dim.log("Taking custom run with time "+obs[sub].time+"s, threshold="+obs[sub].threshold+", biason="+obs[sub].biason);

            var customRun = function()
            {
                v8.sleep(500);//wait that configuration is set
                dim.wait("FTM_CONTROL", "TriggerOn", 15000);
                dim.send("FAD_CONTROL/SEND_SINGLE_TRIGGER");
                dim.send("RATE_CONTROL/STOP");
                dim.send("FTM_CONTROL/STOP_TRIGGER");
                dim.wait("FTM_CONTROL", "Valid", 3000);
                dim.send("FTM_CONTROL/ENABLE_TRIGGER", true);
                dim.send("FTM_CONTROL/SET_TIME_MARKER_DELAY", 123);
                dim.send("FTM_CONTROL/SET_THRESHOLD", -1, obs[sub].threshold);
                v8.sleep(500);//wait that configuration is set
                dim.send("FTM_CONTROL/START_TRIGGER");
                dim.wait("FTM_CONTROL", "TriggerOn", 15000);
            }

            takeRun("custom", -1, obs[sub].time, customRun);
        }
        dim.log("Task finished [CUSTOM].");
        dim.log("");
        break; // case "CUSTOM"

    case "DATA":

        // ========================== case "DATA" ============================
    /*
        if (Sun.horizon("FACT").isUp)
        {
            console.out("  SHUTDOWN","");
            Shutdown();
            console.out("  Exit forced due to broken schedule", "");
            exit();
        }
    */

        // Calculate remaining time for this observation in minutes
        var remaining = nextObs==undefined ? 0 : (nextObs.start-new Date())/60000;
        //dim.log("DEBUG: remaining: "+remaining+" nextObs="+nextObs+" start="+nextObs.start);

        // ------------------------------------------------------------

        dim.log("Run count "+run+" [remaining "+parseInt(remaining)+"min]");

        // ----- Time since last DRS Calibration [min] ------
        var diff = getTimeSinceLastDrsCalib();

        // Changine pointing position and take calibration...
        //  ...every four runs (every ~20min)
        //  ...if at least ten minutes of observation time are left
        //  ...if this is the first run on the source
        var point  = (run%4==0 && remaining>10 && !obs[sub].orbit) || run==0; // undefined==null -> true!

        // Take DRS Calib...
        //  ...every four runs (every ~20min)
        //  ...at last  every two hours
        //  ...when DRS temperature has changed by more than 2deg (?)
        //  ...when more than 15min of observation are left
        //  ...no drs calibration was done yet
        var drscal = (run%4==0 && (remaining>15 && diff>70)) || diff==null;

        if (point)
        {
            // Switch the voltage to a reduced voltage level
            service_feedback.voltageOn(0);

            // Change wobble position every four runs,
            // start with alternating wobble positions each day
            var wobble = (parseInt(run/4) + parseInt(new Date()/1000/3600/24-0.5))%2+1;
            var angle  = obs[sub].angle == null ? Math.random()*360 : obs[sub].angle;

            if (obs[sub].orbit) // != undefined, != null, != 0
                dim.log("Pointing telescope to '"+obs[sub].source+"' [orbit="+obs[sub].orbit+"min, angle="+angle+"]");
            else
                dim.log("Pointing telescope to '"+obs[sub].source+"' [wobble="+wobble+"]");

            // This is a workaround to make sure that we really catch
            // the new OnTrack state later and not the old one
            dim.send("DRIVE_CONTROL/STOP");
            dim.wait("DRIVE_CONTROL", "Initialized", 15000);

            if (obs[sub].orbit) // != undefined, != null, != 0
                dim.send("DRIVE_CONTROL/TRACK_ORBIT", angle, obs[sub].orbit, obs[sub].source);
            else
                dim.send("DRIVE_CONTROL/TRACK_WOBBLE", wobble, obs[sub].source);

            // Do we have to check if the telescope is really moving?
            // We can cross-check the SOURCE service later
        }

        if (drscal)
        {
            doDrsCalibration(irq, "data");  // will turn voltage off

            // Now we switch on the voltage and a significant amount of
            // time has been passed, so do the check again.
            sun = Sun.horizon(-12);
            if (!was_up && sun.isUp)
            {
                dim.log("Sun rise detected....");
                continue;
            }
        }

        if (irq)
            continue;

        OpenLid();

        // This is now th right time to wait for th drive to be stable
        dim.wait("DRIVE_CONTROL", "OnTrack", 150000); // 110s for turning and 30s for stabilizing

        // Now check the voltage... (do not start a lot of stuff just to do nothing)
        var state = dim.state("FEEDBACK").name;
        if (state=="Warning" || state=="Critical" || state=="OnStandby")
        {
            v8.sleep(60000);
            continue;
        }

        // Now we are 'OnTrack', so we can ramp to nominal voltage
        // and wait for the feedback to get stable
        service_feedback.voltageOn();
        service_feedback.waitForVoltageOn(irq);

        // If pointing had changed, do calibration
        if (!irq && point)
        {
            dim.log("Starting calibration.");

            // Calibration (2% of 20')
            while (!irq)
            {
                if (irq || !takeRun("pedestal",         1000))  // 80 Hz  -> 10s
                    continue;
//                if (irq || !takeRun("light-pulser-ext", 1000))  // 80 Hz  -> 10s
//                    continue;
                break;
            }
        }

        //console.out("  Taking data: start [5min]");

        // FIXME: What do we do if during calibration something has happened
        // e.g. drive went to ERROR? Maybe we have to check all states again?

        var twilight = Sun.horizon(-16).isUp;

        if (twilight)
        {
            for (var i=0; i<5 && !irq; i++)
                takeRun("data", -1, 60); // Take data (1min)
        }
        else
        {
            var len = 300;
            while (!irq && len>15)
            {
                var time = new Date();
                if (takeRun("data", -1, len)) // Take data (5min)
                    break;

                len -= parseInt((new Date()-time)/1000);
            }
        }

        //console.out("  Taking data: done");
        run++;

        continue; // case "DATA"
    }

    if (nextObs!=undefined && sub==obs.length-1)
        dim.log("Next observation will start at "+nextObs.start.toUTCString()+" [id="+nextObs.id+"]");

    sub++;
}

sub_drsruns.close();

dim.log("Left main loop [irq="+irq+"]");

// ================================================================
// Comments and ToDo goes here
// ================================================================

// error handline : http://www.sitepoint.com/exceptional-exception-handling-in-javascript/
// classes: http://www.phpied.com/3-ways-to-define-a-javascript-class/
