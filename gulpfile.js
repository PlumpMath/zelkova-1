var gulp = require("gulp");
var rimraf = require("rimraf");
var ts = require("gulp-typescript");
var tslint = require("gulp-tslint");
var eventStream = require("event-stream");
var nodeunit = require("gulp-nodeunit");

var tsPath = "src/*.ts";
var testPath = "test/test-*.js";

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

gulp.task("make", ["clean", "lint"], function () {
  var tsResult = gulp
    .src(tsPath)
    .pipe(ts(tsProject));

  return eventStream
    .merge(tsResult.dts.pipe(gulp.dest("dist/defs")),
           tsResult.js.pipe(gulp.dest("dist/js")));
});

gulp.task("test", ["make"], function () {
  return gulp
    .src(testPath)
    .pipe(nodeunit());
});

gulp.task("default", ["test"]);

gulp.task("watch", ["default"], function () {
  gulp.watch([tsPath, testPath], ["test"]);
});
