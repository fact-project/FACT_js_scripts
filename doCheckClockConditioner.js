'use strict';


function doCheckClockConditioner(){
    var sub_counter = new Subscription("FTM_CONTROL/COUNTER");
    var counter = sub_counter.get(3000, false).counter;
    dim.send("FTM_CONTROL/REQUEST_STATIC_DATA");
    v8.timeout(
        3000,
        function() {
            if (sub_counter.get(0, false).counter > counter)
                return true;
        }
    );

    if (sub_counter.get(0, false).qos & 0x100 == 0)
        throw new Error("Clock conditioner not locked.");

    sub_counter.close();
}

function monitor_clock_conditioner(evt)
{
    if (evt.qos>0 && evt.qos!=2 && evt.qos&0x100==0)
        throw new Error("FTM reports: clock conditioner not locked.");
}