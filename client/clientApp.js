"use strict";
var ctx;
var canvas;
var findNewPartnerButton;
var draws = {};//Will contain objects that look like {image: imageData} to be drawn in the canvas
var clientUsername = "new"; //Set this to the user's username
var iconPartnerUsername = "";
var iconIndex;
var icon = new Image;
var socket;

$(document).ready(function() {

    function handleError(message) {
        $("#errorMessage").text(message);
		console.log(message);
		alert(message);
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
	
	function init()
	{
		console.log("init");
		canvas = document.querySelector("#mainCanvas");
		ctx = canvas.getContext("2d");
		ctx.font = "10px Arial";
		canvas.addEventListener('click', onClick);
		findNewPartnerButton = document.querySelector("#findNew");
		findNewPartnerButton.addEventListener('click', newPartnerRequest);
		clientUsername = document.querySelector("#loginName").value;
		console.log(clientUsername);
		
		socket = io.connect();
		socket.on('connect', function()
		{
			socket.emit('iconJoin', {username:clientUsername});
		});
		
		socket.on('iconNewUser', function(data)
		{
			if(clientUsername !== data.username)
			{
				console.log("Error, local username does not match server username");
			}
			clientUsername = data.username;
			console.log("The server has given this client the username of " + clientUsername);
		});
		
		socket.on('iconPaired', function(data)
		{
			iconPartnerUsername = data.iconPartner;
			iconIndex = data.iconIndex;
			icon.src = data.icon;
			$("#iconDebug").attr("src", icon.src);
			console.log("Icon - matching this user (" + clientUsername + ") with " + iconPartnerUsername);
			console.log(icon.src);
		});
		
		socket.on('iconPartnerFound', function()
		{
			canvasWriteText("Hit the button for a new partner");
		});
		
		socket.on('setIconPartnerUsername', function(data)
		{
			console.log("setting icon partner username to \"" + data.newIconPartnerUsername + "\" .");
			iconPartnerUsername = data.newIconPartnerUsername;
		});
		
		socket.on('iconPartnerDisconnected', function(data)
		{
			iconPartnerUsername = "";
			iconIndex = -1;
			console.log(data.message);
			icon.src = ""
			$("#iconDebug").attr("src", icon.src);
		});
	}
	//Make events here for all the interactive buttons on the client's app
	//Also add all the socket.on events here to respond to all the client/server communications
	
		
	function onClick (e)
	{
		if(iconPartnerUsername != "")
		{
			var currentTime = new Date().getTime();
			socket.emit('iconClicked', {username:clientUsername, iconPartner:iconPartnerUsername, clickTime:currentTime});
		}
	}
	
	function newPartnerRequest (e)
	{
		canvasWriteText("Waiting for Partner");
		
		if(iconPartnerUsername != "")
		{
			socket.emit('iconPartnerRequestNew', {username:clientUsername, iconPartner: iconPartnerUsername});
			iconPartnerUsername = "";
			iconIndex = -1;
			icon.src = ""
			$("#iconDebug").attr("src", icon.src);
		}
		else
		{
			socket.emit('iconPartnerRequest', {username:clientUsername});
		}
	}
	
	function draw(e)
	{
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.globalCompositeOperation = "source-over";
		ctx.drawImage(e, 0,0);
	}
	
	function canvasWriteText(e)
	{
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillText(e, 5, 25);
	}
	window.onload = init;
});