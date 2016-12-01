'use strict';


function print_line_of_equal_signs(){
    console.out(("\n%78s".$("")).replace(/ /g, "="));
}

function print_info_about_first_observation(){
    observations = getSchedule();
    var test = get_index_of_current_observation(observations);
    if (test!=undefined)
    {
        var n = new Date();
        if (observations.length>0 && test==-1)
            dim.log(
                "First observation scheduled for "
                +observations[0].start.toUTCString()
                +" [id="+observations[0].id+"]"
                );
        if (test>=0 && test<observations.length)
            dim.log(
                "First observation should start immediately ["
                +observations[test].start.toUTCString()
                +", id="+observations[test].id+"]"
                );
        if (observations.length>0 && observations[0].start>n+12*3600*1000)
            dim.log("No observations scheduled for the next 12 hours!");
        if (observations.length==0)
            dim.log("No observations scheduled!");
    }
}


