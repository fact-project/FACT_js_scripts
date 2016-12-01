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