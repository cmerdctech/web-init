'use strict';
const qtoolsGen = require('qtools');
const qtools = new qtoolsGen(module);

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

const permissionMasterGen = require('permission-master');

//START OF moduleFunction() ============================================================

var moduleFunction = function(args) {

	qtools.validateProperties({
		subject: args || {},
		targetScope: this, //will add listed items to targetScope
		propList: [
			{
				name: 'config',
				optional: false
			},
			{
				name: 'apiManager',
				optional: true
			},
			{
				name: 'initCallback',
				optional: false
			}
		]
	});

	qtools.validateProperties({
		subject: this.config || {},
		targetScope: this, //will add listed items to targetScope
		propList: [
			{
				name: 'webInit',
				optional: false
			}
		]
	});

	qtools.validateProperties({
		subject: this.config.webInit || {},
		targetScope: this, //will add listed items to targetScope
		propList: [
			{
				name: 'port',
				optional: false
			},
			{
				name: 'htmlFilePath',
				optional: true
			},
			{
				name: 'name',
				optional: true
			}
		]
	});

	qtools.validateProperties({
		subject: this.config.system || {},
		targetScope: this, //will add listed items to targetScope
		propList: [
			{
				name: 'name',
				optional: true
			}
		]
	}); //When this is fit into a larger system, it is preferable to use the overall system name if it exists

	this.permissionMaster = new permissionMasterGen(args);
	
	//LOCAL FUNCTIONS ====================================


	const listPaths = () => {
		qtools.logDebug("\nexpress.route path list (at startAll) =========================\n");
		this.router._router.stack.forEach((item) => {
			qtools.logDebug(item.regexp);
		});
		qtools.logDebug("\nEND express.route =========================\n");

	};

	//METHODS AND PROPERTIES ====================================

	this.shutdown = (message, callback) => {
		callback('', message);
	}

	//START SERVER =======================================================

	const expressRoutesErrorHandler = (err, req, res, next) => {
		err = err ? err : {};
		if (!err.code || typeof (+err.code) != 'number') {
			err.code = 500;
		}
		if (err.errorObject) {
			err.errorText = err.errorObject;
		}

		const miscInconsistencyNeedsCleanup = (err.errorText && err.errorText.errorText) || err.message;

		const foundErrorText = miscInconsistencyNeedsCleanup || err.errorText; //use err.errorText from now on

		res.status(err.code).send({
			errorSource: 'web-init',
			errorText: (foundErrorText || 'unexpected error')
		});
	};

	this.startServer = () => {
		app.use(expressRoutesErrorHandler);

		const server = app.listen(this.port);

		server.on('listening', () => {
			var address = server.address();
			var url = 'http://' + (address.address === '::' ?
				'localhost' : address.address) + ':' + address.port;

			qtools.logNote(`${this.name} listening on ${url}`, {highlightCapsPrefix:'red'});


		});

	}

	//SET UP SERVER =======================================================

	app.use(bodyParser.urlencoded({
		extended: true
	}))
	app.use(bodyParser.json())

	app.use((req, res, next) => {
		if (typeof (this.transactionCount) == 'undefined') {
			this.transactionCount = 0;
		}
		this.transactionCount++;
		//	console.log("transaction# " + this.transactionCount + " =======================\n");
		next();
	});

	app.use((req, res, next) => {
		const headers = {};
		for (var i in req.headers) {
			var element = req.headers[i];
			if (!(i.match(/^x-/) || i.match(/^host/))) {
				headers[i] = element;
			}
		}
		req.headers = headers;
		next();
	});
	
// 	app.use((req, res, next) => {
// 		qtools.logDetail(`req.path= ${req.path}`);
// 		next();
// 	});

	const unpackRequest = (req, res, next) => {
		/*to accomodate the token, the transfer format is:
			{
				data://whatever the data source wants,
				token://whatever the security system wants
			}
		*/
		if (req.query) {
			if (req.query.token) {
				req.token = req.query.token;
			}
			delete req.query.token;
			req.query = Object.assign({}, req.query, req.query.data);
		}
		if (req.body) {
			if (req.body.token) {
				req.token = req.body.token;
			}
			delete req.body.token;
			req.body = req.body.data;
		}

		if (req.body && req.body.token) {
			delete req.body.token;
		}
		next();
	};
	
	/*
		The htmlFilePath is not protected by permissionMaster because it comes before
		the application of unpackRequest.
		
		This is because Safari refuses to display videos sent via staticPageDispatch
		even though all other browsers do.
		
		In the future, I would like to make a file walk that adds paths to 
		permissionMaster. Presently, however, that would be premature optimization.
		None of the files here are private.
		
		In fact, once that's done, I would like to remove staticPageDispatch. It's
		purpose is to assemble and process files (I know. Bad name.) and that is
		not needed for this application.
	
	*/
	
	if (this.config.webInit.htmlFilePath) {
		const filePathList = qtools.convertNumericObjectToArray(this.config.webInit.htmlFilePath);
		for (var i = 0, len = filePathList.length; i < len; i++) {
			var element = filePathList[i];
			app.use(express.static(element));
		}
	}

	app.use(unpackRequest, this.permissionMaster.checkPath);


	let route;
	let method;

	route = new RegExp('/ping$');
	method = 'get';
	this.permissionMaster.addRoute(method, route, 'all');
	app[method](route, (req, res, next) => {
		res.send(`webInit() says, ${this.name} is up and running at ${req.path}`);
	})

	//INITIALIZATION ====================================
	if (this.apiManager) {
		this.apiManager.registerApi('listPaths', listPaths);
	}

	this.router = app;
	this.initCallback();

	return this;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();

