'use strict';


function getTimeSinceLastDrsCalib()
{
    // ----- Time since last DRS Calibration [min] ------
    var runs = FadControl.get_drs_runs(0);
    var diff = (new Date()-runs.time)/60000;

    // Warning: 'roi=300' is a number which is not intrisically fixed
    //          but can change depending on the taste of the observers
    var valid = runs.obj['run'][2]>0 && runs.obj['roi']==300;

    if (valid)
        dim.log("Last DRS calibration was %.1fmin ago".$(diff));
    else
        dim.log("No valid DRS calibration available.");

    return valid ? diff : null;
}