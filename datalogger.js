'use strict';

function Datalogger(){
    var datalogger_subscriptions = new Subscription("DATA_LOGGER/SUBSCRIPTIONS");
    datalogger_subscriptions.get(3000, false);

    datalogger_subscriptions.check = function()
    {
        var obj = this.get();
        if (!obj.data)
            throw new Error("DATA_LOGGER/SUBSCRIPTIONS not available.");

        var expected =
            [
             "AGILENT_CONTROL_24V/DATA",
             "AGILENT_CONTROL_50V/DATA",
             "AGILENT_CONTROL_80V/DATA",
             "BIAS_CONTROL/CURRENT",
             "BIAS_CONTROL/DAC",
             "BIAS_CONTROL/NOMINAL",
             "BIAS_CONTROL/VOLTAGE",
             "DRIVE_CONTROL/POINTING_POSITION",
             "DRIVE_CONTROL/SOURCE_POSITION",
             "DRIVE_CONTROL/STATUS",
             "DRIVE_CONTROL/TRACKING_POSITION",
             "FAD_CONTROL/CONNECTIONS",
             "FAD_CONTROL/DAC",
             "FAD_CONTROL/DNA",
             "FAD_CONTROL/DRS_RUNS",
             "FAD_CONTROL/EVENTS",
             "FAD_CONTROL/FEEDBACK_DATA",
             "FAD_CONTROL/FILE_FORMAT",
             "FAD_CONTROL/FIRMWARE_VERSION",
             "FAD_CONTROL/INCOMPLETE",
             "FAD_CONTROL/PRESCALER",
             "FAD_CONTROL/REFERENCE_CLOCK",
             "FAD_CONTROL/REGION_OF_INTEREST",
             "FAD_CONTROL/RUNS",
             "FAD_CONTROL/RUN_NUMBER",
             "FAD_CONTROL/START_RUN",
             "FAD_CONTROL/STATISTICS1",
             "FAD_CONTROL/STATS",
             "FAD_CONTROL/STATUS",
             "FAD_CONTROL/TEMPERATURE",
             "FEEDBACK/CALIBRATED_CURRENTS",
             "FEEDBACK/CALIBRATION",
             "FEEDBACK/CALIBRATION_R8",
             "FEEDBACK/CALIBRATION_STEPS",
             "FSC_CONTROL/CURRENT",
             "FSC_CONTROL/HUMIDITY",
             "FSC_CONTROL/TEMPERATURE",
             "FSC_CONTROL/VOLTAGE",
             "FTM_CONTROL/COUNTER",
             "FTM_CONTROL/DYNAMIC_DATA",
             "FTM_CONTROL/ERROR",
             "FTM_CONTROL/FTU_LIST",
             "FTM_CONTROL/PASSPORT",
             "FTM_CONTROL/STATIC_DATA",
             "FTM_CONTROL/TRIGGER_RATES",
             "GPS_CONTROL/NEMA",
             "SQM_CONTROL/DATA",
             "LID_CONTROL/DATA",
             "MAGIC_LIDAR/DATA",
             "MAGIC_WEATHER/DATA",
             "MCP/CONFIGURATION",
             "PWR_CONTROL/DATA",
             "RATE_CONTROL/THRESHOLD",
             "RATE_SCAN/DATA",
             "RATE_SCAN/PROCESS_DATA",
             "TEMPERATURE/DATA",
             "TIME_CHECK/OFFSET",
             "TNG_WEATHER/DATA",
             "TNG_WEATHER/DUST",
             "PFMINI_CONTROL/DATA",
            ];

        function map(entry)
        {
            if (entry.length==0)
                return undefined;

            var rc = entry.split(',');
            if (rc.length!=2)
                throw new Error("Subscription list entry '"+entry+"' has wrong number of elements.");
            return rc;
        }

        var list = obj.data.split('\n').map(map);
        function check(name)
        {
            if (list.every(function(el){return el==undefined || el[0]!=name;}))
                throw new Error("Subscription to '"+name+"' not available.");
        }

        expected.forEach(check);
    }

    return datalogger_subscriptions;
}

