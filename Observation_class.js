'use strict';

//
// this file contains just the implementation of the
// Observation class (I know there are no classes in javascript...)
//

function Observation(obj)
{
    if (typeof(obj)!='object')
        throw new Error("Observation object can only be constructed using an object.");

    if (!obj.date)
        throw new Error("Observation object must have a 'date' parameter");

    var ret = [];

    // FIXME: Check transisiton from summer- and winter-time!!
    var utc = obj.date.toString().toUpperCase()=="NOW" ? new Date() : new Date(obj.date);
    if (isNaN(utc.valueOf()))
        throw new Error('"'+obj.date+'" not a valid Date... try something like "2013-01-08 23:05 UTC".');
    ret.start = utc;
    ret.id    = obj.id;

    // If the given data is not an array, make it the first entry of an array
    // so that we can simply loop over all entries
    if (obj.measurements.length===undefined)
    {
        var cpy = obj.measurements;
        obj.measurements = [];
        obj.measurements[0] = cpy;
    }

    for (var i=0; i<obj.measurements.length; i++)
    {
        var obs = obj.measurements[i];

        ret[i] = { };
        ret[i].task   = obs.task ? obs.task.toUpperCase() : "DATA";
        ret[i].source = obs.source;
        ret[i].ra     = parseFloat(obs.ra);
        ret[i].dec    = parseFloat(obs.dec);
        ret[i].zd     = parseFloat(obs.zd);
        ret[i].az     = parseFloat(obs.az);
        ret[i].orbit  = parseFloat(obs.orbit);
        ret[i].angle  = parseFloat(obs.angle);
        ret[i].time   = parseInt(obs.time);
        ret[i].threshold = parseInt(obs.threshold);
        ret[i].lidclosed = obs.lidclosed;
        ret[i].biason = obs.biason;
        ret[i].rstype = obs.rstype ? obs.rstype : "default";
        ret[i].sub    = i;
        ret[i].start  = utc;


        ret[i].toString = function()
        {
            var rc = this.task;
            rc += "["+this.sub+"]";
            if (this.source)
                rc += ": " + this.source;
            return rc;
        }

        switch (ret[i].task)
        {
        case 'DATA':
            if (i!=obj.measurements.length-1)
                throw new Error("DATA [n="+i+", "+utc.toUTCString()+"] must be the last in the list of measurements [cnt="+obj.measurements.length+"]");
            if (ret[i].source == undefined)
                throw new Error("Observation must have either 'source' or 'task' " +
                                "if 'task' == 'data' it must have also have 'source' ");
            if (ret[i].lidclosed == true)
                throw new Error("Observation must not have 'lidclosed'== true " +
                                "if 'task' == 'data' ");
            break;

        case 'STARTUP':
            if (ret[i].source != undefined)
                console.out("warning. Observation with task='startup' also has source defined");
            break;

        case 'SHUTDOWN':
            if (ret[i].source != undefined)
                console.out("warning. Observation with task='shutdown' also has source defined");
            break;

        case 'RATESCAN':
            if (ret[i].source == undefined && (isNaN(ret[i].ra) || isNaN(ret[i].dec)))
                throw new Error("Observation must have either 'source' or 'ra' & 'dec' " +
                                "if 'task' == 'ratescan'");
            if (ret[i].lidclosed == true)
                throw new Error("Observation must not have 'lidclosed'== true " +
                                "if 'task' == 'ratescan' ");
            break;

        case 'RATESCAN2':
            if ((ret[i].lidclosed != true) && ret[i].source == undefined && (isNaN(ret[i].ra) || isNaN(ret[i].dec)))
                throw new Error("Observation must have either 'source' or 'ra' & 'dec' " +
                                "if 'task' == 'ratescan2' and lidclosed==false or not given");
            if (ret[i].lidclosed == true && (isNaN(ret[i].az) || isNaN(ret[i].az)))
                throw new Error("Observation must have 'zd' & 'az' " +
                                "if 'task' == 'ratescan2' and option 'lidclosed'=='true'");
            break;

        case 'CUSTOM':

            if (isNaN(ret[i].az) || isNaN(ret[i].az) || isNaN(ret[i].time) || isNaN(ret[i].threshold))
                throw new Error("Observation must have 'zd' & 'az', 'time' and 'threshold' " +
                                "if 'task' == 'custom' ");
            break;

        case 'SINGLEPE':
        case 'OVTEST':
        case 'DRSCALIB':
        case 'IDLE':
        case 'SLEEP':
            break;

        default:
            throw new Error("The observation type "+ret[i].task+" is unknown.");
        }
    }

    return ret;
}
