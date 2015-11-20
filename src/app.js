//TODO:
//	Set up router for all the relevant pages
//--Create middleware folder and implement middleware
//	Add to Account model, give each user object the data they need, teams, icons, etc.
//	Create an Event model with an event owner, created date, event name that can only be edited by event owner, eventually add space for information like bathroom locations and stuff
//	Create a #errorMessage span on each page that will contain the error text for displaying to the user
//--Use "clientApp.js" instead of "maker.js"
//--Add clientApp to Account controller in place of maker.js
//	Handle POST requests on the clientApp page in router. app.post("/clientApp",	controllers.APPCONTROLLER.handlePosts);
// 	Add ClientAppModel that will have a findByOwner function
//	AccountDestroy - find a way to have the uer's account name in Account.js controller to pass into the account model destroy function
//  When the user connects to the app, set their username in the websockets application. Dont get them from the server.
//  Put client functions in clientApp.js and server functions in this file below in the "websockets stuff" section

//	For each of these event listeners have them go make a call to router (since we already have access to it here)

//Router will then have get/posts for each one of the actions the server can take with websockets stuff and will call functions in a DIFFERENT app controller

//Create an app controller that has the iconClicked, iconPartnerRequest functions, and rather than have them implemented as anonymous functions, make them their own functions that the app controller can use 

//import libraries
var path = require('path');
var express = require('express');
var compression = require('compression');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var url = require('url');
var csrf = require('csurf');
var app = express();
var socketio = require('socket.io');



var dbURL = process.env.MONGOLAB_URI || "mongodb://localhost/FinalProject";

var db = mongoose.connect(dbURL, function(err)
{
	if(err)
	{
		console.log("Could not connect to database");
		throw err;
	}
});

var redisURL =
{
	hostname: 'localhost',
	port: 6379
};

var redisPASS;

if(process.env.REDISCLOUD_URL)
{
	redisURL = url.parse(process.env.REDISCLOUD_URL);
	redisPASS = redisURL.auth.split(":")[1];
}

//pull in our routes
var router = require('./router.js');
var port = process.env.PORT || process.env.NODE_PORT || 3050;

app.use('/assets', express.static(path.resolve(__dirname+'../../client/')));
app.use(compression());
app.use(bodyParser.urlencoded(
{
	extended: true
}));
app.use(session(
{
	key: "sessionid",
	store: new RedisStore(
	{
		host: redisURL.hostname,
		port: redisURL.port,
		pass: redisPASS
	}),
	secret: "Burrito Emoji",
	resave: true,
	saveUninitialized: true,
	cookie:
	{
		httpOnly:true
	}
}));
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
//app.use(favicon(__dirname + '/../client/img/favicon.png'));
app.disable('x-powered-by');
app.use(cookieParser());

//csrf must come AFTER app.use(cookieParser());
//and app.use(session({...}));
//should come BEFORE the router
app.use(csrf());
app.use(function (err, req, res, next)
{
	if (err.code !== 'EBADCSRFTOKEN')
	{
		return next(err);
	}
	return;
});

router(app);

var server = app.listen(port, function(err)
{
	if(err)
	{
		throw err;
	}
	console.log('Listening on port ' + port);
});

var io = socketio.listen(server);

var iconUsers = [{name:"admin", paired:true, lastClicked:new Date('December 17, 1995 03:24:00')}];
var sockets = [];
var onJoined = function(socket)
{
	socket.on('iconJoin', function(data)
	{
		console.log(data.username + " has joined");
		
		socket.iconUsername = Math.floor(Math.random() * 10000);	//Get their actual usernames here
		
		sockets[socket.iconUsername] = socket;
		
		socket.join('iconRoom1');	//Put our new user into the appropriate room
		
		socket.emit('iconNewUser', {username:socket.iconUsername});	//Send them back their generated name
	});
};

var onMsg = function(socket)
{
	socket.on('iconPartnerRequest', function(data)
	{
		console.log(data.username + " wants a new partner.");
		var defaultTime = new Date('December 17, 1995 03:24:00');
		var newUser = {name: data.username, paired:false, lastClicked:defaultTime};
		delete iconUsers[newUser.name];//if the user already exists, delete the old object
		iconUsers.forEach( function(user)
		{
			if(user.paired ===false)	//if an unpaired user is found, pair it up with the new user
			{
				console.log(user.name + " is unpaired");
				user.paired = true;
				newUser.paired = true;
				//Actually put REAL images into the icon variable here
				socket.emit('iconPaired', {iconPartner:user.name, icon:"Icon data - pairing up " + newUser.name + " and " + user.name});
				sockets[user.name].emit('iconPaired', {iconParnter:newUser.name, icon:"Icon data - pairing up " + newUser.name + " and " + user.name});
			}
		});
		iconUsers[newUser.name] = newUser;
	});
	
	socket.on('iconClicked', function(data)
	{
		console.log(data.username + " clicked their icon at " + data.currentTime);
		console.log(data.username + "'s parner is " + data.iconPartner + " and they last clicked their icon at " + iconUsers[data.iconPartner].lastClicked);
		console.log("The separation time between the click of " + data.username + " and " + data.iconPartner + " is " + Math.abs(iconUsers[data.iconPartner].lastClicked - iconUsers[data.username].lastClicked));
		iconUsers[data.username].lastClicked = data.currentTime;
		if( Math.abs(iconUsers[data.iconPartner].lastClicked - iconUsers[data.username].lastClicked) < 5 )
		{
			console.log("click time between " + data.username + " and " + data.iconPartner + " is < 5");
			//Return the shared icon to the pool of icons
			//Emit iconPartnerFound
			//Set the paired value of data.username to false, and try to pair both up with unpaired people
		}
	});
};

var findPartner = function(data)
{
	console.log(data.username + " wants a new partner.");
	var defaultTime = new Date('December 17, 1995 03:24:00');
	var newUser = {name: data.username, paired:false, lastClicked:defaultTime};
	delete iconUsers[newUser.name];//if the user already exists, delete the old object
	iconUsers.forEach( function(user)
	{
		if(user.paired ===false)	//if an unpaired user is found, pair it up with the new user
		{
			console.log(user.name + " is unpaired");
			user.paired = true;
			newUser.paired = true;
			//Actually put REAL images into the icon variable here
			socket.emit('iconPaired', {iconPartner:user.name, icon:"Icon data - pairing up " + newUser.name + " and " + user.name});
			sockets[user.name].emit('iconPaired', {iconPartner:newUser.name, icon:"Icon data - pairing up " + newUser.name + " and " + user.name});
		}
	});
};

io.sockets.on('connection', function(socket) {
	//All the functions defind above that we want to attach to event handlers
	onJoined(socket);
	onMsg(socket);
});