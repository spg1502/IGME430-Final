var controllers = require('./controllers');
//var mid = require('./middleware');

var router = function(app)
{
	app.get("/", controllers.Account.loginPage);
};

module.exports = router;