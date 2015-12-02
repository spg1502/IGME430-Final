var _ = require('underscore');
var models = require('../models');

var ClientApp = models.ClientApp;
var Account = models.Account;

var appPage = function(req, res)
{
	ClientApp.ClientAppModel.findByOwner(req.session.account._id, function(err, docs)
	{
		if(err)
		{
			console.log(err);
			return res.status(400).json({error: "An error occurred"});
		}
		else
		{
			res.render('clientApp', {csrfToken: req.csrfToken(), data: docs, username: req.session.account.username});
		}
	});
};

module.exports.clientAppPage = appPage;