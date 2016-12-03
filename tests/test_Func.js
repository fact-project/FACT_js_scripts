'use strict';
include('/home/dneise/operation/scripts/Func.js');

var a = Array(1,2,3,4);
console.out('tesing Func.sum with array a='+a+' should be 10');
console.out(a.reduce(Func.sum));

console.out('tesing Func.sq with array a='+a+' should be 5.477...');
console.out(a.reduce(Func.sq));

console.out('tesing Func.min with array a='+a+' should be 1');
console.out(a.reduce(Func.min));

console.out('tesing Func.max with array a='+a+' should be 4');
console.out(a.reduce(Func.max));

console.out('tesing Func.avg with array a='+a+' should be 2.5');
console.out( Func.avg(a) );

console.out('tesing Func.avg with array a='+a+' should be 2.5');
console.out( Func.avg(a) );

console.out('tesing Func.stat with array a='+a);
console.out( Func.stat(a) );