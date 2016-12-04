'use strict';

include ('/home/dneise/operation/scripts/Observation_class.js');
include ('/home/dneise/operation/scripts/getSchedule.js');


var schedule = getSchedule();
console.out(JSON.stringify(schedule, null, 2));