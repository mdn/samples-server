"use strict";
var connection = null;
var clientID = 0;

var WebSocket = WebSocket || MozWebSocket;

function setUsername() {
  var msg = {
    name: document.getElementById("name").value,
    date: Date.now(),
    id: clientID,
    type: "username"
  };
  connection.send(JSON.stringify(msg));
}

function connect() {
  var serverUrl = "ws://" + window.location.hostname + ":6502";

  connection = new WebSocket(serverUrl);

  connection.onopen = function(evt) {
    document.getElementById("text").disabled = false;
    document.getElementById("send").disabled = false;
  };

  connection.onmessage = function(evt) {
    var f = document.getElementById("chatbox").contentDocument;
    var text = "";
    var msg = JSON.parse(evt.data);
    var time = new Date(msg.date);
    var timeStr = time.toLocaleTimeString();

    switch(msg.type) {
      case "id":
        clientID = msg.id;
        setUsername();
        break;
      case "username":
        text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
        break;
      case "message":
        text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
        break;
      case "rejectusername":
        text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
        break;
      case "userlist":
        var ul = "";
        var i;

        for (i=0; i < msg.users.length; i++) {
          ul += msg.users[i] + "<br>";
        }
        document.getElementById("userlistbox").innerHTML = ul;
        break;
    }

    if (text.length) {
      f.write(text);
      document.getElementById("chatbox").contentWindow.scrollByPages(1);
    }
  };
}

function send() {
  var msg = {
    text: document.getElementById("text").value,
    type: "message",
    id: clientID,
    date: Date.now()
  };
  connection.send(JSON.stringify(msg));
  document.getElementById("text").value = "";
}

function handleKey(evt) {
  if (evt.keyCode === 13 || evt.keyCode === 14) {
    if (!document.getElementById("send").disabled) {
      send();
    }
  }
}
