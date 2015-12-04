var models = require('../models');

var Account = models.Account;

var loginPage = function(req, res)
{
	res.render('login', {csrfToken: req.csrfToken()});
};

var signupPage = function(req, res)
{
	res.render('signup', {csrfToken: req.csrfToken()});
};

var logout = function(req, res)
{
	console.log("Successful logout for user " + req.session.account.username);
	req.session.destroy();
	res.redirect('/');
};

var accountDestroy = function(req, res)
{
	console.log("Successful account destroy for user " + req.session.account.username);
	Account.AccountModel.accountDestroy(req.session.account.username);
	req.session.destroy();
	res.redirect('/');
};

var login = function(req, res)
{
	if(!req.body.username || !req.body.pass)
	{
		return res.status(400).json({error: "All fields are required"});
	}
	
	Account.AccountModel.authenticate(req.body.username, req.body.pass, function(err, account)
	{
		if(err || !account)
		{
			return res.status(401).json({error: "Wrong username or password"});
		}
		req.session.account = account.toAPI();
		console.log("Successful login for: " + req.body.username);
		res.json({redirect: '/clientApp'});
		//Here's where we should start up the websockets too
	});
};

var signup = function(req, res)
{
	if(!req.body.username || !req.body.pass || !req.body.pass2)
	{
		return res.status(400).json({error: "All fields are required"});
	}
	
	if(req.body.pass !== req.body.pass2)
	{
		return res.status(400).json({error: "Passwords do not match"});
	}
	
	Account.AccountModel.generateHash(req.body.pass, function(salt,hash)
	{
		var accountData =
		{
			username: req.body.username,
			salt: salt,
			password: hash
		};
		
		var newAccount = new Account.AccountModel(accountData);
		
		newAccount.save(function(err)
		{
			if(err)
			{
				console.log(err);
				return res.status(400).json({error:"An error occured"});
			}
			req.session.account = newAccount.toAPI();
			console.log("Successful signup for: " + accountData.username);
			res.json({redirect: '/clientApp'});
		});
	});
};

module.exports.loginPage = loginPage;
module.exports.login = login;
module.exports.logout = logout;
module.exports.signupPage = signupPage;
module.exports.signup = signup;
module.exports.accountDestroy = accountDestroy;