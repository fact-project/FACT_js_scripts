'use strict';


var Func = function() { };
Func.sum = function(a, b) { return a+b; };
Func.sq  = function(a, b) { return Math.sqrt(a*a + b*b); };
Func.min = function(a, b) { return Math.min(a, b); };
Func.max = function(a, b) { return Math.max(a, b); };
Func.avg = function(arr)  { return arr.reduce(Func.Sum, 0)/arr.length; };
Func.stat = function(arr, func)
{
    if (arr.length===0)
        return undefined;

    var sum = 0;
    var sq  = 0;
    var cnt = 0;
    var min = arr[0];
    var max = arr[0];
    arr.forEach(function(val, idx) { sum+=val; sq+=val*val; if (val>max) max=val; if (val<min) min=val; if (func && func(val, idx)) cnt++; });
    sum /= arr.length;
    sq  /= arr.length;

    return { avg:sum, rms:Math.sqrt(sq-sum*sum), min:min, max:max, count:cnt };
};
