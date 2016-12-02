'use strict';

var FadControl = (function() {

    var incomplete = 0;
    var sub_incomplete = new Subscription("FAD_CONTROL/INCOMPLETE");
    sub_incomplete.get(5000);
    var sub_startrun = new Subscription("FAD_CONTROL/START_RUN");
    sub_startrun.get(5000);
    var sub_runs = new Subscription("FAD_CONTROL/RUNS");
    sub_runs.get(5000);
    var service_drs = new Subscription("FAD_CONTROL/DRS_RUNS");
    service_drs.get(5000);



    // private function, which can be plugged into Subscription.onchange.
    function FadIncomplete_onchange_function(evt)
    {
        if (!evt.data)
            return;

        var inc = evt.obj['incomplete'];
        if (!inc || inc>0xffffffffff)
            return;

        if (incomplete>0)
            return;

        if (dim.state("MCP").name!="TakingData")
            return;

        console.out("");
        dim.log("Incomplete event ["+inc+","+incomplete+"] detected, sending MCP/STOP");

        incomplete = inc;
        dim.send("MCP/STOP");
    }

    return { // public interface
        plug_in_onchange_function: function() {
            sub_incomplete.onchange = FadIncomplete_onchange_function;
        },
        plug_off_onchange_function: function() {
            sub_incomplete.onchange = undefined;
        },
        reset_incomplete: function() {
            incomplete = 0;
        },
        get_startrun: function(timeout, requireNamed) {
            return sub_startrun.get(timeout, requireNamed);
        },
        get_incomplete: function(timeout, requireNamed) {
            return sub_incomplete.get(timeout, requireNamed);
        },
        get_runs:  function(timeout, requireNamed) {
            return sub_runs.get(timeout, requireNamed);
        },
        get_drs_runs: function(timeout, requireNamed) {
            return service_drs.get(timeout, requireNamed);
        },
        get_incomplete_: function() {
            return incomplete;
        },
    };
})();
