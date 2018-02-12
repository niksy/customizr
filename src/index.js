/* jshint node: true */
module.exports = function (settings, callback) {
	"use strict";

	// Dependencies
	var fs = require("fs"),
		path = require("path"),
		pkgDir = require("pkg-dir");

	// Deferreds
	var promise = require("promised-io/promise");

	// Modernizr
	var modernizrPath = pkgDir.sync(path.dirname(require.resolve('modernizr')));

	var Customizr = function () {
		return this.init();
	};

	function prepareCustomTests (customTests, cb) {

		if ( !customTests.length ) {
			return cb();
		}

		var customTestsPath = path.join(modernizrPath, 'feature-detects/custom-tests');
		try {
			fs.statSync(customTestsPath);
		} catch ( e ) {
			fs.mkdirSync(customTestsPath);
		}
		customTests.forEach(function (test) {
			var testFilename = path.basename(test);
			fs.writeFileSync(path.join(customTestsPath, testFilename), fs.readFileSync(fs.realpathSync(test)));
		});
		return cb();
	}

	Customizr.prototype = {
		init : function () {

			// Store settings
			this.utils.storeSettings(settings);

			prepareCustomTests(this.utils.getSettings().customTests, function () {

				// Sequentially return promises
				promise.seq([

					// Use Modernizr to fetch metadata from each feature detect
					this.metadata.init.bind(this),

					// Look in the current project for references to tests
					this.crawler.init.bind(this),

					// Construct a list with matching positives, tell Modernizr to build a custom suite
					this.builder.init.bind(this),

					// Send done callback
					this.finalize.bind(this)

				]);

			}.bind(this));

		},

		finalize : function (obj) {
			// Store the current options.
			// If a subsequent build matches the options,
			// we can assume the cached version will do fine.
			this.utils.saveOptions(obj.options);

			// All done.
			return (callback || function () {})(obj);
		}
	};

	// Import modules
	fs.readdirSync(__dirname).filter(function (file) {
		return path.extname(file) === ".js";
	}).filter(function (file) {
		return file !== path.basename(__filename);
	}).forEach(function (file) {
		var _import = path.basename(file, ".js");
		Customizr.prototype[_import] = require(path.join(__dirname, _import))(modernizrPath);
	});

	return new Customizr();
};
