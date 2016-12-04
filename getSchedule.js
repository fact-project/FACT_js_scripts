'use strict';

function get_measurementName_by_key(){
    // Connect to database
    var db = new Database($['schedule-database']);

    // List of all available measurement types (see also Observation_class.js)
    measurementName_by_key = {}
    db.query("SELECT * from MeasurementType").forEach(
        function(row){
            measurementName_by_key[row.fMeasurementTypeKey] = row.fMeasurementTypeName.toUpperCase();
        }
    );
    db.close();
    return measurementName_by_key;
}

function get_sources_by_key(){
    // get all sources from database and make a map by key from the list.
    var db = new Database($['schedule-database']);

    var sources_by_key = {}
    db.query("SELECT * from Source").forEach(
        function(source_row){
            sources_by_key[source_row.fSourceKEY] = source_row.fSourceName
        }
    );
    db.close();
    return sources_by_key;
}

function get_schedule_list_from_db(){
    var db = new Database($['schedule-database']);

    // Because Main.js could start a new observations just in the moment between 'now'
    // and entering the new data in the database, we have to use the unique id
    // in Main.js to check if the current observation should be changed (and sub resetted)
    var start = new Date();
    start = new Date(start.getTime()-10*3600000);


    // Get the current schedule
    var rows = db.query(
        "SELECT * FROM Schedule WHERE fStart>'"
        + start.toISOString()
        + "' ORDER BY fStart, fMeasurementID"
        );

    // Close db connection
    db.close();
    return rows
}

function jsonify_schedule_fData(string){
    var obj = {};
    if (string)
    {
        obj = JSON.parse(("{"+string+"}").replace(/\ /g, "").replace(/(\w+):/gi, "\"$1\":"));
    }
    return obj
}

function getSchedule()
{
    var measurementName_by_key = get_measurementName_by_key();
    var sources_by_key = get_sources_by_key();
    var rows = get_schedule_list_from_db();

    var schedule = [];
    var entry    = -1;

    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];

        if (row.fMeasurementID == 0)
            entry++;

        var m = { }

        m.task = measurementName_by_key[row.fMeasurementTypeKey];

        if (row.fSourceKey)
            m.source = sources_by_key[row.fSourceKey];

        for (var key in jsonify_schedule_fData(row.fData))
            m[key] = obj[key];

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

function get_index_of_current_observation(now)
{
    observations = getSchedule();
    if (now==undefined)
        now = new Date();

    if (isNaN(now.valueOf()))
        throw new Error("Date argument in get_index_of_current_observation invalid.");

    for (var i=0; i<observations.length; i++)
        if (now<observations[i].start)
            return i-1;

    return observations.length-1;
}

function get_current_observation(now)
{
    observations = getSchedule();
    if (now==undefined)
        now = new Date();

    if (isNaN(now.valueOf()))
        throw new Error("Date argument in get_index_of_current_observation invalid.");

    for (var i=0; i<observations.length; i++)
        if (now<observations[i].start)
            return observations[i-1];

    return undefined;
}

function get_next_observation(now)
{
    observations = getSchedule();
    if (now==undefined)
        now = new Date();

    if (isNaN(now.valueOf()))
        throw new Error("Date argument in get_index_of_current_observation invalid.");

    for (var i=0; i<observations.length; i++)
        if (now<observations[i].start)
            return observations[i];

    return undefined;
}
