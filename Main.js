'use strict';
include('scripts/FadControl.js');
include('scripts/feedback.js');
include('scripts/datalogger.js');

// Dim Servers
var service_feedback = Feedback();
var datalogger_subscriptions = Datalogger();

include('scripts/check_power_on_time.js');
include('scripts/check_states_early_not_sure_how_to_name_this.js');
include('scripts/CheckStates.js');
include('scripts/crateReset.js');
include('scripts/do_assert_gps_is_locked.js');
include('scripts/do_bias_calibration_if_needed.js');
include('scripts/doCheckClockConditioner.js');
include('scripts/doCheckFtuConnection.js');
include('scripts/doDrsCalibration.js');
include('scripts/do_power_on_drive.js');
include('scripts/doSetupDaq.js');
include('scripts/do_trigger_off_if_on.js');
include('scripts/Func.js');
include('scripts/getSchedule.js');
include('scripts/getTimeSinceLastDrsCalib.js');
include('scripts/handleBiasVoltageOff.js');
include('scripts/handleFadConnected.js');
include('scripts/handleFeedbackConnected.js');
include('scripts/handleFscConnected.js');
include('scripts/handleFtmIdle.js');
include('scripts/handleFtuCheck.js');
include('scripts/handleLidClosed.js');
include('scripts/handlePwrCameraOn.js');
include('scripts/handleRatectrlConnected.js');
include('scripts/Handler.js');
include('scripts/handle_task_CUSTOM.js');
include('scripts/handle_task_DATA.js');
include('scripts/handle_task_OVTEST.js');
include('scripts/handle_task_RATESCAN2.js');
include('scripts/handle_task_RATESCAN.js');
include('scripts/handle_task_SINGLEPE.js');
include('scripts/Hist1D.js');
include('scripts/Hist2D.js');
include('scripts/lid_functions.js');
include('scripts/Observation_class.js');
include('scripts/print.js');
include('scripts/takeRun.js');
var irq;
include('scripts/irq_setting_functions.js');

//-------------------- Global Variables ---------------------------------------
var system_on;  // a kind of 'short' total system state
                // read it as "should the entire system be on right now?"



// --------- include of functions, which alter global variables
include('scripts/shutdown.js');

var is_sunrise = (function () {
    var was_up_before = Sun.horizon("nautical").isUp;
    return function () {
        var is_up_now = Sun.horizon("nautical").isUp;
        var is_sunrise_ = !was_up_before && is_up_now;
        was_up_before = is_up_now;
        return is_sunrise_;
    };
})();

var make_observation_tracking_function = (function () {
    var last_observation;
    return function (observation) {
        var has_changed = last_observation != observation;
        last_observation = observation;
        return has_changed;
    };
});
var has_obsersation_target_changed = make_observation_tracking_function();
var is_new_next_observation = make_observation_tracking_function();



dim.log("Start: "+__FILE__+" ["+__DATE__+"]");

// This should be set in dimctrl.rc as JavaScript.schedule-database.
// It is sent together with the script to the dimserver.
// If started directly, it has to be set after the command:
//
//   .js scripts/Main.js schedule-database=...
//
if (!$['schedule-database'])
    throw new Error("Environment 'schedule-database' not set!");


dim.onchange['FEEDBACK'] = reschedule_if_high_currents;

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
print_line_of_equal_signs();
do_trigger_off_if_on();
check_states_early_not_sure_how_to_name_this();
check_power_on_time();
do_power_on_drive();
do_bias_calibration_if_needed();
do_assert_gps_is_locked();
check_states_later_before_data_taking_maybe();

var sub_counter = new Subscription("FTM_CONTROL/COUNTER");
sub_counter.onchange = monitor_clock_conditioner;
checkSend(["MCP", "DRIVE_CONTROL", "LID_CONTROL", "FAD_CONTROL", "FEEDBACK"]);

service_feedback.get(5000);
dimctrl.setInterruptHandler(handleIrq);
dim.send("FAD_CONTROL/SET_FILE_FORMAT", 6);

print_info_about_first_observation();

// ----------------------------------------------------------------
// Start main loop
// ----------------------------------------------------------------
dim.log("Entering main loop.");
console.out("");

var run = -2; // get_index_of_current_observation never called
var sub;


while (!processIrq(service_feedback, irq))
{
    var current_observation = get_current_observation();
    var next_observation = get_next_observation();

    if (current_observation === undefined){
        run = -1;
        v8.sleep(1000);
        continue;
    }

    if (is_sunrise()){
        console.out("");
        dim.log("Sun rise detected.... automatic shutdown initiated!");
        // FIXME: State check?
        Shutdown(service_feedback, irq);
        continue;
    }

    if (has_obsersation_target_changed(current_observation)){
        dim.log("Starting new observation ["+current_observation.start.toUTCString()+", id="+current_observation.id+"]");
        sub = 0;
        if (run==-2){
            sub = current_observation.length-1;
        }
        run = 0;
    }

    if (is_new_next_observation(next_observation)){
        if (next_observation)
            dim.log("Next observation scheduled for "+next_observation.start.toUTCString()+" [id="+next_observation.id+"]");
        else
            dim.log("No further observation scheduled.");
        console.out("");
    }

    if (sub>=current_observation.length)
    {
        v8.sleep(1000);
        continue;
    }

    var obs = current_observation[sub];
    if (system_on===false && obs.task!="STARTUP")
    {
        v8.sleep(1000);
        continue;
    }

    // Check if sun is still up... only DATA and */
    if ((obs.task=="DATA" || obs.task=="RATESCAN" || obs.task=="RATESCAN2" ) && Sun.horizon(-12).isUp)
    {
        var now = new Date();
        var remaining = (Sun.horizon(-12).set - now)/60000;
        console.out(now.toUTCString()+" - "+obs.task+": Sun above FACT-horizon: sleeping 1min, remaining %.1fmin".$(remaining));
        v8.sleep(60000);
        continue;
    }


    if (obs.task!="IDLE" && (obs.task!="DATA" && run>0))
        dim.log("New task ["+obs+"]");

    // FIXME: Maybe print a warning if Drive is on during day time!

    // It is not ideal that we allow the drive to be on during day time, but
    // otherwise it is difficult to allow e.g. the STARTUP at the beginning of the night
    var power_states = Sun.horizon(-12).isUp || !system_on ? [ "DriveOff", "SystemOn" ] : [ "SystemOn" ];
    var drive_states = Sun.horizon(-12).isUp || !system_on ? undefined : [ "Initialized", "Tracking", "OnTrack" ];
    check_states_again(power_states, drive_states);

    datalogger_subscriptions.check();

    switch (obs.task)
    {
        case "IDLE":
            v8.sleep(5000);
            continue;

        case "SUSPEND":
        case "SLEEP":
            Shutdown(service_feedback, irq, "sleep");
            dim.log("Task finished [SLEEP].");
            console.out("");
            sub++;
            continue;

        case "STARTUP":
            StartUp(service_feedback, irq);
            dim.log("Task finished [STARTUP]");
            console.out("");
            break;

        case "SHUTDOWN":
            Shutdown(service_feedback, irq, "singlepe");
            sub++;
            dim.log("Task finished [SHUTDOWN]");
            console.out("");
            continue;

        case "DRSCALIB":
            doDrsCalibration(irq, "drscalib");
            dim.log("Task finished [DRSCALIB]");
            console.out("");
            break;

        case "SINGLEPE":
            handle_task_SINGLEPE(service_feedback, irq);
            dim.log("Task finished [SINGLE-PE]");
            console.out("");
            break;

        case "OVTEST":
            handle_task_OVTEST(service_feedback, irq);
            dim.log("Task finished [OVTEST]");
            console.out("");
            break;

        case "RATESCAN":
            handle_task_RATESCAN(service_feedback, obs, irq);
            dim.log("Task finished [RATESCAN]");
            console.out("");
            break;

        case "RATESCAN2":
            handle_task_RATESCAN2(obs, service_feedback);
            dim.log("Task finished [RATESCAN2]");
            console.out("");
            break;

        case "CUSTOM":
            handle_task_CUSTOM(obs, service_feedback);
            dim.log("Task finished [CUSTOM].");
            console.out("");
            break;

        case "DATA":
            handle_task_DATA(service_feedback, obs, next_observation, run, irq);
            run++;
            continue;
    }

    if (next_observation!==undefined && sub==current_observation.length-1)
        dim.log("Next observation will start at "+next_observation.start.toUTCString()+" [id="+next_observation.id+"]");

    sub++;
}



dim.log("Left main loop [irq="+irq+"]");
