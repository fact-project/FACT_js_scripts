'use strict';
// this file contains function, which change the all controlling global
// variable 'irq' in some ways under some conditions
//

// ================================================================
//  Interrupt data taking in case of high currents
// ================================================================
function reschedule_if_high_currents(state)
{
    if ((state.name=="Critical" || state.name=="OnStandby") &&
        (this.prev!="Critical"  && this.prev!="OnStandby"))
    {
        console.out("Feedback state changed from "+this.prev+" to "+state.name+" [Main.js]");
        irq = "RESCHEDULE";
    }
    this.prev=state.name;
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

function processIrq(service_feedback, irq)
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

    if (irq.toUpperCase()=="SHUTDOWN")
    {
        Shutdown(service_feedback, irq);
        return true;
    }

    dim.log("IRQ "+irq+" unhandled... stopping script.");
    return true;
}