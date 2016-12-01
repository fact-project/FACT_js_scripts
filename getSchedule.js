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

    // get all sources from database and make a map by key from the list.
    sources_by_key = {}
    db.query("SELECT * from Source").forEach(
        function(source_row){
            sources_by_key[source_row.fSourceKEY] = source_row.fSourceName
        }
    );


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
        var row = rows[i];

        if (row.fMeasurementID == 0)
            entry++;

        var m = { }

        m.task = measurementType[row.fMeasurementTypeKey];

        if (row.fSourceKey)
            m.source = sources_by_key[row.fSourceKey];
        if (row.fData)
        {
            var obj = JSON.parse(("{"+row.fData+"}").replace(/\ /g, "").replace(/(\w+):/gi, "\"$1\":"));
            for (var key in obj)
                m[key] = obj[key];
        }

        if (!schedule[entry])
            schedule[entry] = { };

        schedule[entry].id   = row.fScheduleID;
        schedule[entry].date = new Date(row.fStart+" UTC");

        if (!schedule[entry].measurements)
            schedule[entry].measurements = [];

        schedule[entry].measurements[row.fMeasurementID] = m;
    }

    for (var i=0; i<schedule.length; i++)
        schedule[i] = new Observation(schedule[i]);

    return schedule;
}
