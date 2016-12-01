'use strict';


function getTimeSinceLastDrsCalib()
{
    var sub_drsruns = new Subscription("FAD_CONTROL/DRS_RUNS");
    sub_drsruns.get(5000);

    // ----- Time since last DRS Calibration [min] ------
    var runs = sub_drsruns.get(0);
    var diff = (new Date()-runs.time)/60000;

    // Warning: 'roi=300' is a number which is not intrisically fixed
    //          but can change depending on the taste of the observers
    var valid = runs.obj['run'][2]>0 && runs.obj['roi']==300;

    if (valid)
        dim.log("Last DRS calibration was %.1fmin ago".$(diff));
    else
        dim.log("No valid DRS calibration available.");

    sub_drsruns.close();
    return valid ? diff : null;
}