'use strict';


function do_trigger_off_if_on(){
	if (dim.state("FTM_CONTROL").name=="TriggerOn")
	{
	    dim.send("FTM_CONTROL/STOP_TRIGGER");
	    dim.wait("FTM_CONTROL", "Valid");
	}
}

