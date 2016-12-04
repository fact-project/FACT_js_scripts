'use strict';

include ('/home/dneise/operation/scripts/Observation_class.js');
include ('/home/dneise/operation/scripts/getSchedule.js');


var schedule = getSchedule();
console.out(JSON.stringify(schedule, null, 2));

// Databases entries look like this:
// ignore fScheduleID .. I was playing around a bit
/*
mysql> mysql> select * from Schedule  where fStart > "2016-12-03";
+-------------+---------------------+---------------------+----------------+----------+-------------------------+------------+---------------------+
| fScheduleID | fStart              | fLastUpdate         | fMeasurementID | fUser    | fData                   | fSourceKey | fMeasurementTypeKey |
+-------------+---------------------+---------------------+----------------+----------+-------------------------+------------+---------------------+
|       23185 | 2016-12-04 18:54:00 | 2016-12-04 16:03:38 |              0 | dneise   | NULL                    |       NULL |                   0 |
|       23186 | 2016-12-04 19:09:00 | 2016-12-04 16:03:38 |              0 | dneise   | NULL                    |          3 |                   4 |
|       23187 | 2016-12-04 21:30:00 | 2016-12-04 16:03:38 |              0 | dneise   | NULL                    |         12 |                   4 |
|       23188 | 2016-12-05 00:48:00 | 2016-12-04 16:03:38 |              0 | dneise   | NULL                    |          5 |                   4 |
|       23189 | 2016-12-05 03:59:00 | 2016-12-04 16:03:38 |              0 | dneise   | "ra": 1.23, "dec": 1.23 |       NULL |                   5 |
|       23190 | 2016-12-05 03:59:00 | 2016-12-04 16:03:38 |              1 | dneise   | NULL                    |       NULL |                   9 |
|       23191 | 2016-12-05 03:59:00 | 2016-12-04 16:03:38 |              2 | dneise   | NULL                    |          1 |                   4 |
|       23192 | 2016-12-05 06:45:00 | 2016-12-04 16:03:38 |              0 | dneise   | NULL                    |       NULL |                   6 |
+-------------+---------------------+---------------------+----------------+----------+-------------------------+------------+---------------------+
*/


// Result today is:
/*
[
  [
    {
      "task": "STARTUP",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 0,
      "start": "2016-12-04T18:54:00.000Z"
    }
  ],
  [
    {
      "task": "DATA",
      "source": "1ES 2344+51.4",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 0,
      "start": "2016-12-04T19:09:00.000Z"
    }
  ],
  [
    {
      "task": "DATA",
      "source": "1H0323+342",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 0,
      "start": "2016-12-04T21:30:00.000Z"
    }
  ],
  [
    {
      "task": "DATA",
      "source": "Crab",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 0,
      "start": "2016-12-05T00:48:00.000Z"
    }
  ],
  [
    {
      "task": "RATESCAN",
      "ra": 1.23,
      "dec": 1.23,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 0,
      "start": "2016-12-05T03:59:00.000Z"
    },
    {
      "task": "SLEEP",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 1,
      "start": "2016-12-05T03:59:00.000Z"
    },
    {
      "task": "DATA",
      "source": "Mrk 421",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 2,
      "start": "2016-12-05T03:59:00.000Z"
    }
  ],
  [
    {
      "task": "SHUTDOWN",
      "ra": null,
      "dec": null,
      "zd": null,
      "az": null,
      "orbit": null,
      "angle": null,
      "time": null,
      "threshold": null,
      "rstype": "default",
      "sub": 0,
      "start": "2016-12-05T06:45:00.000Z"
    }
  ]
]
*/