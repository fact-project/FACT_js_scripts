'use strict';

include ('/home/dneise/operation/scripts/Observation_class.js');
include ('/home/dneise/operation/scripts/getSchedule.js');


var schedule = getSchedule();
console.out(JSON.stringify(schedule, null, 2));

// Result today is:
/*
[
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
      "start": "2016-12-04T06:29:00.000Z"
    }
  ],
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
  ],
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
      "start": "2016-12-05T18:54:00.000Z"
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
      "start": "2016-12-05T19:09:00.000Z"
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
      "start": "2016-12-05T21:26:00.000Z"
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
      "start": "2016-12-06T00:44:00.000Z"
    }
  ],
  [
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
      "sub": 0,
      "start": "2016-12-06T03:55:00.000Z"
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
      "start": "2016-12-06T06:45:00.000Z"
    }
  ]
]
*/