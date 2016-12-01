'use strict';

function doTurnOffIrLeds(){
    var cam = new Curl("fact@cam/cgi-bin/user/Config.cgi");
    cam.data.push("action=set");
    cam.data.push("Camera.System.Title=Camera1");
    cam.data.push("Camera.General.IRControl.Value=2");
    cam.data.push("Camera.System.Display=ALL");
    cam.data.push("Camera.Environment=OUTDOOR");
    var ret = cam.send();
    dim.log("Camera response: "+ret.data.replace(/\n/g,"/")+" ["+ret.rc+"]");
}

function OpenLid()
{
    var isClosed = dim.state("LID_CONTROL").name=="Closed";
    var isInconsistent = dim.state("LID_CONTROL").name=="Inconsistent";

    var tm = new Date();

    // Wait for lid to be open
    if (isClosed || isInconsistent)
    {
        dim.log("Opening lid");
        dim.send("LID_CONTROL/OPEN");

        dim.log("Turning off IR camera LEDs...");
        doTurnOffIrLeds();
    }
    v8.timeout(30000, function() {
        if (
                dim.state("LID_CONTROL").name=="Open"
                || dim.state("LID_CONTROL").name=="PowerProblem"
            ) return true;
    });

    if (isClosed || isInconsistent)
        dim.log("Lid open [%.1fs]".$((new Date()-tm)/1000));
}

function CloseLid()
{
    var isOpen = dim.state("LID_CONTROL").name=="Open";
    var isPowerProblem = dim.state("LID_CONTROL").name=="PowerProblem";

    var tm = new Date();

    // Wait for lid to be open
    if (isOpen || isPowerProblem)
    {
        if (dim.state("FTM_CONTROL").name=="TriggerOn")
        {
            dim.send("FTM_CONTROL/STOP_TRIGGER");
            dim.wait("FTM_CONTROL", "Valid", 3000);
        }

        dim.log("Closing lid.");
        dim.send("LID_CONTROL/CLOSE");
    }
    v8.timeout(30000, function() { if (dim.state("LID_CONTROL").name=="Closed" || dim.state("LID_CONTROL").name=="Inconsistent") return true; });

    if (isOpen || isPowerProblem)
        dim.log("Lid closed [%.1fs]".$((new Date()-tm)/1000));
}
