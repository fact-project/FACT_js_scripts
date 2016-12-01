'use strict';

function Feedback(){
    var service_feedback = new Subscription("FEEDBACK/CALIBRATED_CURRENTS");

    /*
     --> changes this.ok and this.last
    */
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

        this.ok = cnt<3;

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

        var isOn = state=="VoltageOn" || state=="Ramping";
        if (isOn)
        {
            dim.log("Switching voltage off.");

            if (dim.state("FTM_CONTROL").name=="TriggerOn")
            {
                dim.send("FTM_CONTROL/STOP_TRIGGER");
                dim.wait("FTM_CONTROL", "Valid", 3000);
            }
            dim.send("BIAS_CONTROL/SET_ZERO_VOLTAGE");
        }

        dim.wait("BIAS_CONTROL", "VoltageOff", 60000);
        dim.wait("FEEDBACK",     "Calibrated",  3000);

        if (isOn)
            dim.log("Voltage off.");
    }

    service_feedback.voltageOn = function(ov)
    {
        if (isNaN(ov))
            ov = 1.1;

        if (this.ov!=ov && dim.state("FEEDBACK").name=="InProgress")
        {
            dim.log("Stopping feedback.");
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
            dim.wait("FEEDBACK", "InProgress", 45000);
            this.ov = ov;
        }

        dim.wait("BIAS_CONTROL", "VoltageOn", 60000);
    }

    service_feedback.waitForVoltageOn = function(irq)
    {
        dim.log("Waiting for voltage to be stable.");

        function func()
        {
            if (irq || this.ok==true)
                return true;
        }

        var now = new Date();

        this.last = undefined;
        this.ok = false;
        v8.timeout(4*60000, func, this);
        this.ok = undefined;

        if (irq)
            dim.log("Waiting for stable voltage interrupted.");
        else
            dim.log("Voltage stable within limits");
    }

    return service_feedback
}





