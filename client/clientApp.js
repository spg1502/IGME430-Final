"use strict";
var ctx;
var canvas;
var findNewPartnerButton;
var draws = {};//Will contain objects that look like {image: imageData} to be drawn in the canvas
var clientUsername = "new"; //Set this to the user's username
var messageText;
var iconPartnerUsername = "";
var iconRegion;
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
		findNewPartnerButton = document.querySelector("#findNew");
		findNewPartnerButton.addEventListener('click', newPartnerRequest)
		
		iconRegion = document.querySelector("#iconDebug");
		iconRegion.addEventListener('click', onClick);
		
		clientUsername = document.querySelector("#loginName").value;
		messageText = document.querySelector("#messageText");
		
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
			iconRegion.style.visibility = "visible";
			$("#iconDebug").attr("src", icon.src);
			console.log("Icon - matching this user (" + clientUsername + ") with " + iconPartnerUsername);
			console.log(icon.src);
		});
		
		socket.on('iconPartnerFound', function()
		{
			messageText.innerText = "Congratulations on finding one another! Hit the button for a new partner";
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
			iconRegion.style.visibility = "hidden";
			icon.src = ""
			$("#iconDebug").attr("src", icon.src);
			messageText.innerText = "Your partner has disconnected, hit the button for a new partner";
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
		messageText.innerText = "Waiting for Partner";
		
		if(iconPartnerUsername != "")
		{
			socket.emit('iconPartnerRequestNew', {username:clientUsername, iconPartner: iconPartnerUsername});
			iconPartnerUsername = "";
			iconIndex = -1;
			iconRegion.style.visibility = "hidden";
			icon.src = ""
			$("#iconDebug").attr("src", icon.src);
		}
		else
		{
			socket.emit('iconPartnerRequest', {username:clientUsername});
		}
	}
	window.onload = init;
});