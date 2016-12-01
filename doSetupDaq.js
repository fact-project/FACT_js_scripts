'use strict';

// -----------------------------------------------------------------
// Now take care that the bias control, the ftm and the fsc are
// properly connected and are in a reasonable state (e.g. the
// trigger is switched off)
// -----------------------------------------------------------------
function doSetupDaq(){
    checkSend([
        "BIAS_CONTROL",
        "FAD_CONTROL",
        "FTM_CONTROL",
        "FSC_CONTROL",
        "FEEDBACK",
        "RATE_CONTROL",
        "MCP"]);

    dim.send("MCP/RESET");

    var loop;
    loop = new Handler("SystemSetup");
    loop.add(handleBiasVoltageOff);
    loop.add(handleFtmIdle);
    loop.add(handleFscConnected);
    loop.add(handleFadConnected);
    loop.add(handleFeedbackConnected);
    loop.add(handleRatectrlConnected);
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

}


