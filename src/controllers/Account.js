var models = require('../models');

var Account = models.Account;

var loginPage = function(req, res)
{
	res.render('login', {csrfToken: req.csrfToken()});
};

module.exports.loginPage = loginPage;