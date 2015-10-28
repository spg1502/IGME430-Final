var controllers = require('./controllers');
//var mid = require('./middleware');

var router = function(app)
{
	app.get("/login", controllers.Account.loginPage);
	app.post("/login", controllers.Account.login);
	app.get("/signup", controllers.Account.signupPage);
	app.post("/signup", controllers.Account.signup);
	app.get("/", controllers.Account.loginPage);
};

module.exports = router;