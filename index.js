var path = require('path');
var fs = require('fs');
var Q = require('q');

var extensionToLanguage = {
	'feature': 'gherkin',
	'pde': 'processing',
	'ps1': 'powershell',
};

module.exports = {

	hooks: {
		"page:before": function(page) {
			var that = this;
			var pluginConfig = that.options.pluginsConfig['include-highlight'] || {};
			var re = /^!CODEFILE\s+(?:\"([^\"]+)\"|'([^']+)')\s*$/gm;

			var dir = path.dirname(page.rawPath);
			var makePath = function(filename) {

				return path.join(dir, filename);
			};

			var getCodeLang = function(filepath) {
				var lang = "";
				var suffix = filepath.split(".").pop();

				// naively merge config object with language lookup
				if (pluginConfig.extensionToLanguage) {
					for (var ext in pluginConfig.extensionToLanguage) {
						extensionToLanguage[ext] = pluginConfig.extensionToLanguage[ext];
					}
				}

				// look up if mapping from suffix to language exists,
				// otherwise use `suffix`
				lang = extensionToLanguage[suffix] || suffix;
				return lang;
		    };

			var files = {};
			// return a closure for saving the passed text
			var cacheFile = function(filepath) {
				return function(text) {
					files[filepath] = text;
				};
			};

			var readFiles = []; // file promises

			var res;
			while (res = re.exec(page.content)) {

				var filepath = makePath(res[1] || res[2]);
				readFiles.push(
					Q.nfcall(fs.readFile, filepath)
						.then(cacheFile(filepath))
				);
			}
			return Q.all(readFiles)
				.then(function() {
					page.content = page.content.replace(re, function(match, p1, p2) {
						var filepath = makePath(p1 || p2);
						var codeLang = getCodeLang(filepath);
						return "```"+codeLang+"\n" +files[filepath].toString().trim() +"\n```"; // strip whitespace
					});
					return page;
				})
		}
	}
};
