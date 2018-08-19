/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var readFile = fs.readFile.bind(fs);
var loadLoader = require("./loadLoader");

function utf8BufferToString(buf) {
	var str = buf.toString("utf-8");
	if (str.charCodeAt(0) === 0xFEFF) {
		return str.substr(1);
	} else {
		return str;
	}
}

/**
 * req："/abs/path/to/file.txt?query"
 * return :['/abs/path/to/file.txt','?query']
  */

function splitQuery(req) {
	var i = req.indexOf("?");
	if (i < 0) return [req, ""];
	return [req.substr(0, i), req.substr(i)];
}

function dirname(path) {
	if (path === "/") return "/";
	var i = path.lastIndexOf("/");
	var j = path.lastIndexOf("\\");
	var i2 = path.indexOf("/");
	var j2 = path.indexOf("\\");
	var idx = i > j ? i : j;
	var idx2 = i > j ? i2 : j2;
	if (idx < 0) return path;
	if (idx === idx2) return path.substr(0, idx + 1);
	return path.substr(0, idx);
}



function createLoaderObject(loader) {
	var obj = {
		path: null,
		query: null,
		options: null,
		ident: null,
		normal: null,	// loader模块
		pitch: null,
		// 默认情况下，资源文件会被转化为 UTF-8 字符串，然后传给 loader。通过设置 raw，loader 可以接收原始的 Buffer
		raw: null,
		data: null,
		pitchExecuted: false,
		normalExecuted: false
	};
	Object.defineProperty(obj, "request", {
		enumerable: true,
		get: function () {
			return obj.path + obj.query;
		},
		set: function (value) {
			// loaders: ["/abs/path/to/loader.js?query"]
			if (typeof value === "string") {
				var splittedRequest = splitQuery(value);
				obj.path = splittedRequest[0];	// /abs/path/to/loader.js
				obj.query = splittedRequest[1];	// ?query
				obj.options = undefined;
				obj.ident = undefined;
			} else {
				// loaders: [{
				// 	loader:'/abs/path/to/loader.js',
				// 	options:{
				// 		a:1
				// 	}
				// }]
				if (!value.loader)
					throw new Error("request should be a string or object with loader and object (" + JSON.stringify(value) + ")");
				obj.path = value.loader;
				obj.options = value.options;
				obj.ident = value.ident;		// iden ?????
				if (obj.options === null)
					obj.query = "";
				else if (obj.options === undefined)
					obj.query = "";
				else if (typeof obj.options === "string")
					obj.query = "?" + obj.options;
				else if (obj.ident)
					obj.query = "??" + obj.ident;
				else if (typeof obj.options === "object" && obj.options.ident)
					obj.query = "??" + obj.options.ident;
				else
					obj.query = "?" + JSON.stringify(obj.options);
			}
		}
	});
	obj.request = loader;

	// 防止扩展obj
	if (Object.preventExtensions) {
		Object.preventExtensions(obj);
	}
	return obj;
}

function runSyncOrAsync(fn, context, args, callback) {
	var isSync = true;
	var isDone = false;
	var isError = false; // internal error
	var reportedError = false;
	context.async = function async() {
		if (isDone) {
			if (reportedError) return; // ignore
			throw new Error("async(): The callback was already called.");
		}
		isSync = false;
		return innerCallback;
	};

	// 异步后，callback也就异步后调用，从而继续执行pitch，或者loader本身
	var innerCallback = context.callback = function () {
		if (isDone) {
			if (reportedError) return; // ignore
			throw new Error("callback(): The callback was already called.");
		}
		isDone = true;
		isSync = false;
		try {
			callback.apply(null, arguments);
		} catch (e) {
			isError = true;
			throw e;
		}
	};
	try {
		var result = (function LOADER_EXECUTION() {
			// 在这里调用pitch或者loader函数，
			// 从而改变 isSync 的值
			// args=(remainingRequest, precedingRequest, data)
			return fn.apply(context, args);
		}());
		if (isSync) {	// 同步
			isDone = true;
			if (result === undefined)
				return callback();
			// result 是一个 promise
			if (result && typeof result === "object" && typeof result.then === "function") {
				return result.catch(callback).then(function (r) {
					callback(null, r);
				});
			}
			return callback(null, result);
		}
	} catch (e) {
		if (isError) throw e;
		if (isDone) {
			// loader is already "done", so we cannot use the callback function
			// for better debugging we print the error on the console
			if (typeof e === "object" && e.stack) console.error(e.stack);
			else console.error(e);
			return;
		}
		isDone = true;
		reportedError = true;
		callback(e);
	}

}

function convertArgs(args, raw) {
	if (!raw && Buffer.isBuffer(args[0]))
		args[0] = utf8BufferToString(args[0]);
	else if (raw && typeof args[0] === "string")
		args[0] = new Buffer(args[0], "utf-8"); // eslint-disable-line
}

function iteratePitchingLoaders(options, loaderContext, callback) {
	// abort after last loader
	if (loaderContext.loaderIndex >= loaderContext.loaders.length)
		return processResource(options, loaderContext, callback);

	var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

	// iterate
	// 迭代后面的loaders
	if (currentLoaderObject.pitchExecuted) {
		loaderContext.loaderIndex++;
		return iteratePitchingLoaders(options, loaderContext, callback);
	}

	// load loader module
	loadLoader(currentLoaderObject, function (err) {
		if (err) return callback(err);	// 错误处理
		var fn = currentLoaderObject.pitch;
		currentLoaderObject.pitchExecuted = true;
		if (!fn) return iteratePitchingLoaders(options, loaderContext, callback);

		runSyncOrAsync(
			fn,
			loaderContext, [loaderContext.remainingRequest, loaderContext.previousRequest, currentLoaderObject.data = {}],
			function (err) {
				if (err) return callback(err);
				// pitch 的返回结果
				var args = Array.prototype.slice.call(arguments, 1);
				if (args.length > 0) {	// 有返回值了，，就跳过后面的loader
					loaderContext.loaderIndex--;
					iterateNormalLoaders(options, loaderContext, args, callback);
				} else {
					iteratePitchingLoaders(options, loaderContext, callback);
				}
			}
		);
	});
}

function processResource(options, loaderContext, callback) {
	// set loader index to last loader
	loaderContext.loaderIndex = loaderContext.loaders.length - 1;

	// 被解析的资源存在
	var resourcePath = loaderContext.resourcePath;
	if (resourcePath) {
		loaderContext.addDependency(resourcePath);
		options.readResource(resourcePath, function (err, buffer) {
			if (err) return callback(err);
			options.resourceBuffer = buffer;
			iterateNormalLoaders(options, loaderContext, [buffer], callback);
		});
	} else {
		iterateNormalLoaders(options, loaderContext, [null], callback);
	}
}


// 正常的loader函数
function iterateNormalLoaders(options, loaderContext, args, callback) {
	if (loaderContext.loaderIndex < 0)
		return callback(null, args);

	var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

	// iterate
	if (currentLoaderObject.normalExecuted) {
		loaderContext.loaderIndex--;
		return iterateNormalLoaders(options, loaderContext, args, callback);
	}

	var fn = currentLoaderObject.normal;
	currentLoaderObject.normalExecuted = true;
	if (!fn) {
		return iterateNormalLoaders(options, loaderContext, args, callback);
	}

	convertArgs(args, currentLoaderObject.raw);

	runSyncOrAsync(fn, loaderContext, args, function (err) {
		if (err) return callback(err);

		var args = Array.prototype.slice.call(arguments, 1);
		iterateNormalLoaders(options, loaderContext, args, callback);
	});
}

exports.getContext = function getContext(resource) {
	var splitted = splitQuery(resource);
	return dirname(splitted[0]);
};


// runLoaders({
// 	resource: "/abs/path/to/file.txt?query",
// 	// String: Absolute path to the resource (optionally including query string)

// 	loaders: ["/abs/path/to/loader.js?query"],
// 	// String[]: Absolute paths to the loaders (optionally including query string)
// 	// {loader, options}[]: Absolute paths to the loaders with options object

// 	context: { minimize: true },
// 	// Additional loader context which is used as base context

// 	readResource: fs.readFile.bind(fs)
// 	// A function to read the resource
// 	// Must have signature function(path, function(err, buffer))

// }, function(err, result) {
// 	// err: Error?

// 	// result.result: Buffer | String
// 	// The result

// 	// result.resourceBuffer: Buffer
// 	// The raw resource as Buffer (useful for SourceMaps)

// 	// result.cacheable: Bool
// 	// Is the result cacheable or do it require reexecution?

// 	// result.fileDependencies: String[]
// 	// An array of paths (files) on which the result depends on

// 	// result.contextDependencies: String[]
// 	// An array of paths (directories) on which the result depends on
// })

exports.runLoaders = function runLoaders(options, callback) {
	// read options
	var resource = options.resource || "";
	var loaders = options.loaders || [];
	var loaderContext = options.context || {};
	var readResource = options.readResource || readFile;

	// splittedResource=['/abs/path/to/file.txt','?query']
	var splittedResource = resource && splitQuery(resource);

	// splittedResource='/abs/path/to/file.txt'
	var resourcePath = splittedResource ? splittedResource[0] : undefined;

	// resourceQuery='?query'
	var resourceQuery = splittedResource ? splittedResource[1] : undefined;

	// contextDirectory = '/abs/path/to'
	var contextDirectory = resourcePath ? dirname(resourcePath) : null;

	// execution state
	var requestCacheable = true;
	var fileDependencies = [];
	var contextDependencies = [];

	// prepare loader objects
	loaders = loaders.map(createLoaderObject);

	loaderContext.context = contextDirectory;	// 被解析模块的所在目录
	loaderContext.loaderIndex = 0;	// loader的索引
	loaderContext.loaders = loaders;	// 所有loaders
	loaderContext.resourcePath = resourcePath;  // 被解析模块的路径
	loaderContext.resourceQuery = resourceQuery;  // 被解析模块的查询参数
	loaderContext.async = null;		// 告诉 loader-runner 这个 loader 将会异步地回调
	loaderContext.callback = null;	// 一个可以同步或者异步调用的可以返回多个结果的函数
	loaderContext.cacheable = function cacheable(flag) {	// 设置是否可缓存标志的函数
		if (flag === false) {
			requestCacheable = false;
		}
	};
	// 加入一个文件作为产生 loader 结果的依赖，使它们的任何变化可以被监听到
	loaderContext.dependency = loaderContext.addDependency = function addDependency(file) {
		fileDependencies.push(file);
	};
	// 把文件夹作为 loader 结果的依赖加入
	loaderContext.addContextDependency = function addContextDependency(context) {
		contextDependencies.push(context);
	};
	loaderContext.getDependencies = function getDependencies() {
		return fileDependencies.slice();
	};
	loaderContext.getContextDependencies = function getContextDependencies() {
		return contextDependencies.slice();
	};

	// 移除 loader 结果的所有依赖。甚至自己和其它 loader 的初始依赖。考虑使用 pitch。
	loaderContext.clearDependencies = function clearDependencies() {
		fileDependencies.length = 0;
		contextDependencies.length = 0;
		requestCacheable = true;
	};
	Object.defineProperty(loaderContext, "resource", {
		enumerable: true,
		get: function () {
			if (loaderContext.resourcePath === undefined)
				return undefined;
			return loaderContext.resourcePath + loaderContext.resourceQuery;
		},
		set: function (value) {
			var splittedResource = value && splitQuery(value);
			loaderContext.resourcePath = splittedResource ? splittedResource[0] : undefined;
			loaderContext.resourceQuery = splittedResource ? splittedResource[1] : undefined;
		}
	});

	// 被解析出来的 request 字符串
	Object.defineProperty(loaderContext, "request", {
		enumerable: true,
		get: function () {
			return loaderContext.loaders.map(function (o) {
				return o.request;
			}).concat(loaderContext.resource || "").join("!");
		}
	});
	Object.defineProperty(loaderContext, "remainingRequest", {
		enumerable: true,
		get: function () {
			if (loaderContext.loaderIndex >= loaderContext.loaders.length - 1 && !loaderContext.resource)
				return "";
			return loaderContext.loaders.slice(loaderContext.loaderIndex + 1).map(function (o) {
				return o.request;
			}).concat(loaderContext.resource || "").join("!");
		}
	});

	// 当前loader的request
	Object.defineProperty(loaderContext, "currentRequest", {
		enumerable: true,
		get: function () {
			return loaderContext.loaders.slice(loaderContext.loaderIndex).map(function (o) {
				return o.request;
			}).concat(loaderContext.resource || "").join("!");
		}
	});

	// 在该loader之前的request
	Object.defineProperty(loaderContext, "previousRequest", {
		enumerable: true,
		get: function () {
			return loaderContext.loaders.slice(0, loaderContext.loaderIndex).map(function (o) {
				return o.request;
			}).join("!");
		}
	});

	// 当前loader的query
	Object.defineProperty(loaderContext, "query", {
		enumerable: true,
		get: function () {
			var entry = loaderContext.loaders[loaderContext.loaderIndex];
			return entry.options && typeof entry.options === "object" ? entry.options : entry.query;
		}
	});

	// 当前loader的data
	Object.defineProperty(loaderContext, "data", {
		enumerable: true,
		get: function () {
			return loaderContext.loaders[loaderContext.loaderIndex].data;
		}
	});

	// finish loader context
	// 让loaderContext变的不可扩展，也就是永远不能再添加新的属性。
	if (Object.preventExtensions) {
		Object.preventExtensions(loaderContext);
	}

	var processOptions = {
		resourceBuffer: null,
		readResource: readResource
	};
	iteratePitchingLoaders(processOptions, loaderContext, function (err, result) {
		if (err) {
			return callback(err, {
				cacheable: requestCacheable,
				fileDependencies: fileDependencies,
				contextDependencies: contextDependencies
			});
		}
		callback(null, {
			result: result,
			resourceBuffer: processOptions.resourceBuffer,
			cacheable: requestCacheable,
			fileDependencies: fileDependencies,
			contextDependencies: contextDependencies
		});
	});
};
