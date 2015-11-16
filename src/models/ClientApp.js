var mongoose = require('mongoose');
var _ = require('underscore');

var ClientAppModel;

var setUserName = function(name)
{
	return _.escape(name).trim();
};

var setEventName = function(name)
{
	return _.escape(name).trim();
};

var ClientAppSchema = new mongoose.Schema(
{
	name:
	{
		type: String,
		required: true,
		trim: true,
		set: setUserName
	},
	
	eventName:
	{
		type: String,
		required: true,
		trim: true,
		set: setEventName
	},
	
	owner:
	{
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: 'Account'
	},
	
	createdDate:
	{
		type: Date,
		default: Date.now
	}
});

ClientAppSchema.methods.toAPI = function()
{
	return {
		name: this.name,
		eventName: this.eventName,
		owner: this.owner,
		createdDate: this.createdDate
	};
};

ClientAppSchema.statics.findByOwner = function(ownerId, callback)
{
	var search =
	{
		owner: mongoose.Types.ObjectId(ownerId)
	};
	
	return ClientAppModel.find(search).select("name eventName owner createdDate").exec(callback);
};

ClientAppModel = mongoose.model('ClientApp', ClientAppSchema);

module.exports.ClientAppModel = ClientAppModel;
module.exports.ClientAppSchema = ClientAppSchema;