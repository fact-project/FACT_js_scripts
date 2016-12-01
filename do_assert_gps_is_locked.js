'use strict';

function do_assert_gps_is_locked(){

    // ================================================================
    // Setup GPS control and wait for the satellites to be locked
    // ================================================================

    checkSend(["GPS_CONTROL"]);

    if (dim.state("GPS_CONTROL").name=="Disconnected")
        dim.send("GPS_CONTROL/RECONNECT");

    // Wait for being connectes
    v8.timeout(5000, function() { if (dim.state("GPS_CONTROL").name!="Disconnected") return true; });

    // Wait for status available
    v8.timeout(5000, function() { if (dim.state("GPS_CONTROL").name!="Connected") return true; });

    if (dim.state("GPS_CONTROL").name=="Disabled")
        dim.send("GPS_CONTROL/ENABLE");

    dim.wait("GPS_CONTROL", "Locked", 15000);

}
