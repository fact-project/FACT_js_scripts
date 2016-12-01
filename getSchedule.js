function getSchedule()
{
    // List of all available measurement types (see also Observation_class.js)
    var measurementType = [
        "STARTUP",
        "IDLE",
        "DRSCALIB",
        "SINGLEPE",
        "DATA",
        "RATESCAN",
        "SHUTDOWN",
        "OVTEST",
        "RATESCAN2",
        "SLEEP",
        "CUSTOM" ];

    // Because Main.js could start a new observations just in the moment between 'now'
    // and entering the new data in the database, we have to use the unique id
    // in Main.js to check if the current observation should be changed (and sub resetted)
    var start = new Date();
    start = new Date(start.getTime()-10*3600000);

    // ----------------------------------------------------------------------

    // Connect to database
    var db = new Database($['schedule-database']);

    // get all sources from database
    var sources = db.query("SELECT * from Source");

    // Get the current schedule
    var rows = db.query(
        "SELECT * FROM Schedule WHERE fStart>'"
        + start.toISOString()
        + "' ORDER BY fStart, fMeasurementID"
        );

    // Close db connection
    db.close();

    // ----------------------------------------------------------------------

    var schedule = [];
    var entry    = -1;

    for (var i=0; i<rows.length; i++)
    {
        var sub = rows[i]['fMeasurementID'];
        if (sub==0)
            entry++;

        var m = { }

        var task = rows[i]['fMeasurementTypeKey'];
        m.task = measurementType[task];

        var src = rows[i]['fSourceKey'];
        if (src)
        {
            // Convert SourceKey to SourceName
            var arr = sources.filter(function(e) { return e['fSourceKEY']==src; });
            if (arr.length==0)
                throw new Error("SourceKey "+src+" unknown.");

            m.source = arr[0]['fSourceName'];
        }

        var data = rows[i]['fData'];
        if (data)
        {
            var obj = JSON.parse(("{"+data+"}").replace(/\ /g, "").replace(/(\w+):/gi, "\"$1\":"));
            for (var key in obj)
                m[key] = obj[key];
        }

        if (!schedule[entry])
            schedule[entry] = { };

        schedule[entry].id   = rows[i]['fScheduleID'];
        schedule[entry].date = new Date(rows[i]['fStart']+" UTC");

        if (!schedule[entry].measurements)
            schedule[entry].measurements = [];

        schedule[entry].measurements[sub] = m;
    }

    for (var i=0; i<schedule.length; i++)
        schedule[i] = new Observation(schedule[i]);

    return schedule;
}
