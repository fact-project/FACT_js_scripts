'use strict';
include('scripts/Func.js');

var a = Array(1,2,3,4);
console.log('tesing Func.sum with array a='+a+' should be 10');
console.log(a.reduce(Func.sum));

console.log('tesing Func.sq with array a='+a+' should be 5.477...');
console.log(a.reduce(Func.sq));

console.log('tesing Func.min with array a='+a+' should be 1');
console.log(a.reduce(Func.min));

console.log('tesing Func.max with array a='+a+' should be 4');
console.log(a.reduce(Func.max));

console.log('tesing Func.avg with array a='+a+' should be 2.5');
console.log( Func.avg(a) );

console.log('tesing Func.avg with array a='+a+' should be 2.5');
console.log( Func.avg(a) );

console.log('tesing Func.stat with array a='+a);
console.log( Func.stat(a) );