import Zelkova = require("./zelkova");

var src1 = new Zelkova.Channel("src1");
var src2 = new Zelkova.Channel("src2");

var x = src1.map(v => v + " x-map");

var y = src1.dropIf(v => v === "src1" || v === "src1-emit2", "y-init")
            .map(v => v + " y-map1")
            .map(v => v + " y-map2");

// ----------------------------------------------------------------------------

Zelkova.mapN(y, src1, function (y, src1) {
  console.log("y+src1 :: ", y, " / ", src1);
});

Zelkova.mapN(x, y, src2, function (x, y, z) {
  console.log("x+y+src2 :: ", x, " / ", y, " / ", z);
});

// ----------------------------------------------------------------------------

console.log("---");
console.log("src2-emit");
src2.emit("src2-emit");

console.log("---");
console.log("src1-emit1");
src1.emit("src1-emit1");

console.log("---");
console.log("src1-emit2");
src1.emit("src1-emit2");

console.log("---------------------------------------------------------------");

var s1 = new Zelkova.Channel(0);
var s2 = new Zelkova.Channel(0);
var s3 = Zelkova.merge(s1, s2);

s3.subscribe(value => console.log(value));

s1.emit(10);
s2.emit(20);
