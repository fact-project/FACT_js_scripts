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
