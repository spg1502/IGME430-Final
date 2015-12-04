//TODO:
//--Create middleware folder and implement middleware
//	Add to Account model, give each user object the data they need, teams, icons, etc.
//	Create an Event model with an event owner, created date, event name that can only be edited by event owner, eventually add space for information like bathroom locations and stuff
//	Create a #errorMessage span on each page that will contain the error text for displaying to the user
//	Handle POST requests on the clientApp page in router. app.post("/clientApp",	controllers.APPCONTROLLER.handlePosts);
// 	Add ClientAppModel that will have a findByOwner function
//  Adjust spacing of navbar links on client app page
//  Do CSS for the "narrow" window state
//  Store the iconUsers and sockets arrays on the mongo server, not just as variables as a part of the server session
//	When a user disconnects, destroy their socket and iconUser entries
//	Make the images draw in a more sensible place
//	Use smaller images for quicker load times

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
var redisSessionStore = new RedisStore({
		host: redisURL.hostname,
		port: redisURL.port,
		pass: redisPASS
});
app.use(session(
{
	key: "sessionid",
	store: redisSessionStore,
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
app.use(favicon(__dirname + '/../client/img/favicon.png'));
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
var images = [];
for(i = 0; i < 10; i++)
{
	var tempImageData = {index:i, imageUrl:"https://github.com/identicons/" + i.toString() + ".png", paired:false};
	images.push(tempImageData);
}
var onJoined = function(socket)
{
	socket.on('iconJoin', function(data)
	{
		console.log(data.username + " has joined");
		
		socket.iconUsername = data.username;
		
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
				var pairIcon = findUnusedIcon();
				console.log("Pairing requester: " + newUser.name + " with found unpaired user: " + user.name + " using the icon at index " + pairIcon.index);
				user.paired = true;
				newUser.paired = true;
				socket.emit('iconPaired', {iconPartner:user.name, icon:pairIcon.imageUrl, iconIndex:pairIcon.index});
				sockets[user.name].emit('iconPaired', {iconPartner:newUser.name, icon:pairIcon.imageUrl, iconIndex:pairIcon.index});
			}
		});
		iconUsers[newUser.name] = newUser;
	});
	
	socket.on('iconClicked', function(data)
	{
		console.log(data.username + " clicked their icon at " + data.clickTime);
		iconUsers[data.username].lastClicked = data.clickTime;
		console.log("The separation time between the click of " + data.username + " and " + data.iconPartner + " is " + Math.abs(iconUsers[data.iconPartner].lastClicked - iconUsers[data.username].lastClicked));
		if( Math.abs(iconUsers[data.iconPartner].lastClicked - iconUsers[data.username].lastClicked) < 5000 )
		{
			console.log("click time between " + data.username + " and " + data.iconPartner + " is < 5000");
			iconUsers[data.username].paired = false;
			socket.emit('setIconPartnerUsername', {newIconPartnerUsername:""});
			iconUsers[data.iconPartner].paired = false;
			sockets[data.iconPartner].emit('setIconPartnerUsername', {newIconPartnerUsername:""});
			//Return the shared icon to the pool of icons
			//Emit iconPartnerFound
			socket.emit('iconPartnerFound');
			sockets[data.iconPartner].emit('iconPartnerFound');
		}
	});
};

var findUnusedIcon = function()
{
	for(i = 0; i < images.length; i++)
	{
		if(images[i].paired == false)
		{
			images[i].paired = true;
			return {imageUrl:images[i].imageUrl, index:images[i].index};
		}
	}
}

io.sockets.on('connection', function(socket) {
	//All the functions defind above that we want to attach to event handlers
	onJoined(socket);
	onMsg(socket);
});