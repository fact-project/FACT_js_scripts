'use strict';

function check_states_early_not_sure_how_to_name_this(){
    console.out("Checking states(check_states_early_not_sure_how_to_name_this).");
    if (!checkStates([
         [ "MCP",                 [ "Idle"      ] ],
         [ "AGILENT_CONTROL_24V", [ "VoltageOn" ] ],
         [ "AGILENT_CONTROL_50V", [ "VoltageOn" ] ],
         [ "AGILENT_CONTROL_80V", [ "VoltageOn" ] ],
         [ "FTM_CONTROL",         [ "Valid"     ] ],
         [ "FAD_CONTROL",         [ "Connected",    "RunInProgress"   ] ],
         [ "BIAS_CONTROL",        [ "Disconnected", "VoltageOff"      ] ],
         [ "DATA_LOGGER",         [ "WaitForRun",   "NightlyFileOpen", "Logging" ] ],
    ]))
    {
        throw new Error("Something unexpected has happened. One of the servers",
                "is in a state in which it should not be. Please,",
                "try to find out what happened...");
    }
}


function check_states_later_before_data_taking_maybe()
{
    if (!checkStates([
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
        ]))
    {
        throw new Error("Something unexpected has happened. Although the startup-"+
                        "procedure has finished, not all servers are in the state "+
                        "in which they ought to be. Please, try to find out what "+
                        "happened...");
    }

}

function check_states_again(power_states, drive_states){
   // A scheduled task was found, lets check if all servers are
    // still on and in reasonable states. If this is not the case,
    // something unexpected must have happend and the script is aborted.


    if (!checkStates([
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
        ]))
    {
        throw new Error("Something unexpected has happened. One of the servers "+
                        "is in a state in which it should not be. Please,"+
                        "try to find out what happened...");
    }

}