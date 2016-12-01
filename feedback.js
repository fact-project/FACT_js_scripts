'use strict';

function Feedback(){
    var service_feedback = new Subscription("FEEDBACK/CALIBRATED_CURRENTS");

    service_feedback.onchange = function(evt)
    {
        if (!evt.data)
            return;

        if (this.ok==undefined)
            return;

        var Unom = evt.obj['U_nom'];
        var Uov  = evt.obj['U_ov'];
        if (!Uov)
            return;

        var cnt = 0;
        var avg = 0;
        for (var i=0; i<320; i++)
        {
            // This is a fix for the channel with a shortcut
            if (i==272)
                continue;

            var dU = Uov[i]-Unom;

            // 0.022 corresponds to 1 DAC count (90V/4096)
            if (Math.abs(dU)>0.033)
                cnt++;

            avg += dU;
        }
        avg /= 320;

        this.ok = cnt<3;// || (this.last!=undefined && Math.abs(this.last-avg)<0.002);

        console.out("  DeltaUov=%.3f (%.3f) [N(>0.033V)=%d]".$(avg, avg-this.last, cnt));

        this.last = avg;
    }

    service_feedback.voltageOff = function()
    {
        var state = dim.state("BIAS_CONTROL").name;

        if (state=="Disconnected")
        {
            console.out("  Voltage off: bias crate disconnected!");
            return;
        }

        // check of feedback has to be switched on
        var isOn = state=="VoltageOn" || state=="Ramping";
        if (isOn)
        {
            dim.log("Switching voltage off.");

            if (dim.state("FTM_CONTROL").name=="TriggerOn")
            {
                dim.send("FTM_CONTROL/STOP_TRIGGER");
                dim.wait("FTM_CONTROL", "Valid", 3000);
            }

            // Supress the possibility that the bias control is
            // ramping and will reject the command to switch the
            // voltage off
            //dim.send("FEEDBACK/STOP");
            //dim.wait("FEEDBACK", "Calibrated", 3000);

            // Make sure we are not in Ramping anymore
            //dim.wait("BIAS_CONTROL", "VoltageOn", 3000);

            // Switch voltage off
            dim.send("BIAS_CONTROL/SET_ZERO_VOLTAGE");
        }

        dim.wait("BIAS_CONTROL", "VoltageOff", 60000); // FIXME: 30000?
        dim.wait("FEEDBACK",     "Calibrated",  3000);

        // FEEDBACK stays in CurrentCtrl when Voltage is off but output enabled
        // dim.wait("FEEDBACK", "CurrentCtrlIdle", 1000);

        if (isOn)
            dim.log("Voltage off.");
    }
    // DN:  The name of the method voltageOn() in the context of the method
    //      voltageOff() is a little bit misleading, since when voltageOff() returns
    //      the caller can be sure the voltage is off, but when voltageOn() return
    //      this is not the case, in the sense, that the caller can now take data.
    //      instead the caller of voltageOn() *must* call waitForVoltageOn() afterwards
    //      in order to safely take good-quality data.
    //      This could lead to nasty bugs in the sense, that the second call might
    //      be forgotten by somebody
    //
    //      so I suggest to rename voltageOn() --> prepareVoltageOn()
    //      waitForVoltageOn() stays as it is
    //      and one creates a third method called:voltageOn() like this
    /*      service_feedback.voltageOn = function()
     *      {
     *          this.prepareVoltageOn();
     *          this.waitForVoltageOn();
     *      }
     *
     * */
    //      For convenience.

    service_feedback.voltageOn = function(ov)
    {
        if (isNaN(ov))
            ov = 1.1;

        if (this.ov!=ov && dim.state("FEEDBACK").name=="InProgress") // FIXME: Warning, OnStandby, Critical if (ov<this.ov)
        {
            dim.log("Stoping feedback.");
            if (dim.state("FTM_CONTROL").name=="TriggerOn")
            {
                dim.send("FTM_CONTROL/STOP_TRIGGER");
                dim.wait("FTM_CONTROL", "Valid", 3000);
            }

            dim.send("FEEDBACK/STOP");
            dim.wait("FEEDBACK", "Calibrated", 3000);

            // Make sure we are not in Ramping anymore
            dim.wait("BIAS_CONTROL", "VoltageOn", 3000);
        }

        var isOff = dim.state("FEEDBACK").name=="Calibrated";
        if (isOff)
        {
            dim.log("Switching voltage to Uov="+ov+"V.");

            dim.send("FEEDBACK/START", ov);

            // FIXME: We could miss "InProgress" if it immediately changes to "Warning"
            //        Maybe a dim.timeout state>8 ?
            dim.wait("FEEDBACK", "InProgress", 45000);

            this.ov = ov;
        }

        // Wait until voltage on
        dim.wait("BIAS_CONTROL", "VoltageOn", 60000); // FIXME: 30000?
    }

    service_feedback.waitForVoltageOn = function()
    {
        // Avoid output if condition is already fulfilled
        dim.log("Waiting for voltage to be stable.");

        function func()
        {
            if (irq || this.ok==true)
                return true;
        }

        var now = new Date();

        this.last = undefined;
        this.ok = false;
        v8.timeout(4*60000, func, this); // FIMXE: Remove 4!
        this.ok = undefined;

        if (irq)
            dim.log("Waiting for stable voltage interrupted.");
        else
            dim.log("Voltage stable within limits");
    }

    return service_feedback
}





