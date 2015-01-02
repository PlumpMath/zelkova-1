var gulp = require("gulp");
var rimraf = require("rimraf");
var ts = require("gulp-typescript");
var tslint = require("gulp-tslint");
var eventStream = require("event-stream");
var nodeunit = require("gulp-nodeunit");
var vmap = require("vinyl-map");
var path = require("path");

var tsPath = "src/*.ts";
var testPath = "test/test-*.js";

var printError = function (err) {
  console.error(err);
  this.emit("end");
};

var tsProject = ts.createProject({
  module: "commonjs",
  declarationFiles: true,
  noExternalResolve: true
});

gulp.task("clean", function (cb) {
  rimraf("./dist", cb);
});

gulp.task("lint", function () {
  return gulp
    .src(tsPath)
    .pipe(tslint({
      configuration: require("./tslint.json"),
      emitError: false
    }))
    .pipe(tslint.report("verbose", {
      emitError: false
    }));
});

// Make the generated defs file actually useful
var tweakDefs = vmap(function (data, filename) {
  var moduleName = path.basename(filename, ".d.ts");
  return data.toString("utf8")
    .replace("declare module " + moduleName + " {", "declare module '" + moduleName + "' {")
    .replace("export = " + moduleName + ";", "");
});

gulp.task("make", ["clean", "lint"], function () {
  var tsResult = gulp
    .src(tsPath)
    .pipe(ts(tsProject));

  return eventStream
    .merge(tsResult.dts.pipe(tweakDefs).pipe(gulp.dest("dist")),
           tsResult.js.pipe(gulp.dest("dist")))
    .on("error", printError);
});

gulp.task("test", ["make"], function () {
  return gulp
    .src(testPath)
    .pipe(nodeunit())
    .on("error", printError);
});

gulp.task("default", ["test"]);

gulp.task("watch", ["default"], function () {
  gulp.watch([tsPath, "test/*.js"], ["test"]);
});
