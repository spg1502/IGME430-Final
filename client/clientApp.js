"use strict";
var ctx;
var canvas;
var findNewPartnerButton;
var draws = {};//Will contain objects that look like {image: imageData} to be drawn in the canvas
var clientUsername = "new"; //Set this to the user's username
var iconPartnerUsername = "";
var icon = new Image();
var socket;

$(document).ready(function() {

    function handleError(message) {
        $("#errorMessage").text(message);
		console.log(message);
    }
    
    function sendAjax(action, data) {
        $.ajax({
            cache: false,
            type: "POST",
            url: action,
            data: data,
            dataType: "json",
            success: function(result, status, xhr) {
                console.log("Successful Ajax sent");
				
				window.location = result.redirect;
            },
            error: function(xhr, status, error) {
                var messageObj = JSON.parse(xhr.responseText);
            
                handleError(messageObj.error);
            }
        });        
    }
	
	canvas = document.querySelector("#mainCanvas");
	ctx = canvas.getContext("2d");
	canvas.addEventListener('click', onClick);
	findNewPartnerButton = document.querySelector("#findNew");
	findNewPartnerButton.addEventListener('click', newPartnerRequest);
	
	socket = io.connect();
	socket.on('connect', function()
	{
		socket.emit('iconJoin', {username:clientUsername});
	});
	
	socket.on('iconNewUser', function(data)
	{
		clientUsername = data.username;
		console.log("The server has given this client the username of " + clientUsername);
	});
	//Make events here for all the interactive buttons on the client's app
	//Also add all the socket.on events here to respond to all the client/server communications
});