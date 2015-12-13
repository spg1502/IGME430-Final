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
var sockets = [];	//key:value array, key is usernames, value is the socket address
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
		var BreakException = {};
		try {
			iconUsers.forEach( function(user)
			{
				if(user.paired ===false)	//if an unpaired user is found, pair it up with the new user
				{
					var pairIcon = findUnusedIcon();
					newUser.iconIndex = pairIcon.index;
					user.iconIndex = pairIcon.index;
					console.log("Pairing requester: " + newUser.name + " with found unpaired user: " + user.name + " using the icon at index " + pairIcon.index);
					user.paired = true;
					newUser.paired = true;
					socket.emit('iconPaired', {iconPartner:user.name, icon:pairIcon.imageUrl, iconIndex:pairIcon.index});
					sockets[user.name].emit('iconPaired', {iconPartner:newUser.name, icon:pairIcon.imageUrl, iconIndex:pairIcon.index});
					//Break out here
					throw BreakException;
				}
			});
		} catch(e)
		{
			if ( e!== BreakException) throw e;
		}
		iconUsers[newUser.name] = newUser;
	});
	
	socket.on('iconPartnerRequestNew', function(data)
	{
		console.log(data.username + " wants a new partner.");
		var defaultTime = new Date('December 17, 1995 03:24:00');
		var newUser = {name: data.username, paired:false, lastClicked:defaultTime};
		if(iconUsers[newUser.name].name !== "" && iconUsers[newUser.name].paired === true)
		{
			images[iconUsers[newUser.name].iconIndex].paired = false;
			sockets[data.iconPartner].emit('iconPartnerDisconnected', {message: newUser.name + " Has requested a new partner, unmatching you. Feel free to hit the button to find a new partner"});
		}
		delete iconUsers[newUser.name];//if the user already exists, delete the old object
		iconUsers.forEach( function(user)
		{
			if(user.paired ===false)	//if an unpaired user is found, pair it up with the new user
			{
				var pairIcon = findUnusedIcon();
				newUser.iconIndex = pairIcon.index;
				user.iconIndex = pairIcon.index;
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
			iconUsers[data.iconPartner].lastClicked = (new Date().getTime() - new Date(2014, Math.random() * 11, Math.random() * 28));
			iconUsers[data.username].lastClicked = (new Date().getTime() - new Date(2014, Math.random() * 11, Math.random() * 28));
			iconUsers[data.username].paired = false;
			socket.emit('setIconPartnerUsername', {newIconPartnerUsername:""});
			iconUsers[data.iconPartner].paired = false;
			sockets[data.iconPartner].emit('setIconPartnerUsername', {newIconPartnerUsername:""});
			images[iconUsers[data.username].iconIndex].paired = false;
			socket.emit('iconPartnerFound');
			sockets[data.iconPartner].emit('iconPartnerFound');
		}
	});
};

var findUnusedIcon = function()
{
	for(i = 0; i < images.length; i++)
	{
		if(images[i].paired === false)
		{
			images[i].paired = true;
			return {imageUrl:images[i].imageUrl, index:images[i].index};
		}
	}
};

var disconnectUser = function(username)
{
	sockets.forEach(function (element, index)
	{
		if( element.iconUsername == username )
		{
			console.log("disconnecting user " + username);
			images[iconUsers[username].iconIndex].paired = false;
			//Add disconnect code for unpairing users etc.
		}
	});
};

io.sockets.on('connection', function(socket) {
	//All the functions defind above that we want to attach to event handlers
	onJoined(socket);
	onMsg(socket);
});

module.exports.disconnectUser = disconnectUser;