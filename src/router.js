var controllers = require('./controllers');
//var mid = require('./middleware');

var router = function(app)
{
	app.get("/login", 			controllers.Account.loginPage);
	app.post("/login", 			controllers.Account.login);
	app.get("/signup", 			controllers.Account.signupPage);
	app.post("/signup", 		controllers.Account.signup);
	app.get("/logout",			controllers.Account.logout);
	app.get("/accountDestroy",	controllers.Account.accountDestroy);
	app.get("/clientApp",		controllers.ClientApp.clientAppPage);
	//app.post("/clientApp",		controllers.ClientApp.handlePosts);
	app.get("/", 				controllers.Account.loginPage);
};

module.exports = router;