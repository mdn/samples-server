//#!/usr/bin/env node
//
// WebSocket chat server
// Implemented using Node.js
//
// Requires the websocket module.
//
// WebSocket and WebRTC based multi-user chat sample with two-way video
// calling, including use of TURN if applicable or necessary.
//
// This file contains the JavaScript code that implements the server-side
// functionality of the chat system, including user ID management, message
// reflection, and routing of private messages, including support for
// sending through unknown JSON objects to support custom apps and signaling
// for WebRTC.
//
// Requires Node.js
//
// To read about how this sample works:  http://bit.ly/webrtc-from-chat
//
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

"use strict";

const url = require('url');
const fs = require('fs');
const path = require('path');
const process = require('process');
const express = require('express');
const WebSocketServer = require('ws').Server;

const PORT_NUMBER = process.env.PORT;
const CONNECTION_TIMEOUT = (5 * 60) * 1000000;      // WebSocket server timeout: 5 minutes

// Used for managing the text chat user list.

var connectionArray = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

// Output logging information to console

function log(text) {
  var time = new Date();

  console.log("[" + time.toLocaleTimeString() + "] " + text);
}

// Scans the list of users and see if the specified name is unique. If it is,
// return true. Otherwise, returns false. We want all users to have unique
// names.

function isUsernameUnique(name) {
  var isUnique = true;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].username === name) {
      isUnique = false;
      break;
    }
  }
  return isUnique;
}

// Sends a message (which is already stringified JSON) to a single
// user, given their username. We use this for the WebRTC signaling,
// and we could use it for private text messaging.

function sendToOneUser(target, msgString) {
  var isUnique = true;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].username === target) {
      connectionArray[i].send(msgString);
      break;
    }
  }
}

// Scan the list of connections and return the one for the specified
// clientID. Each login gets an ID that doesn't change during the session,
// so it can be tracked across username changes.

function getConnectionForID(id) {
  var connect = null;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].clientID === id) {
      connect = connectionArray[i];
      break;
    }
  }

  return connect;
}

// Builds a message object of type "userlist" which contains the names of
// all connected users. Used to ramp up newly logged-in users and,
// inefficiently, to handle name change notifications.

function makeUserListMessage() {
  var userListMsg = {
    type: "userlist",
    users: []
  };
  var i;

  // Add the users to the list

  for (i=0; i<connectionArray.length; i++) {
    userListMsg.users.push(connectionArray[i].username);
  }

  return userListMsg;
}

// Sends a "userlist" message to all chat members. This is a cheesy way
// to ensure that every join/drop is reflected everywhere. It would be more
// efficient to send simple join/drop messages to each user, but this is
// good enough for this simple example.

function sendUserListToAll() {
  var userListMsg = makeUserListMessage();
  var userListMsgStr = JSON.stringify(userListMsg);
  var i;

  for (i=0; i<connectionArray.length; i++) {
    connectionArray[i].send(userListMsgStr);
  }
}

// Create the HTTP server.

var app = express();
var router = express.Router();

app.use("/", router);
app.use(express.static("views"));
app.use(express.static("public"));

log("HTTP server configured");

var httpServer = app.listen(PORT_NUMBER, function() {
  log("Static web server now listening");
});

// Create the WebSocket server.

const wssOptions = {
  server: httpServer,
  timeout: CONNECTION_TIMEOUT
};

const wss = new WebSocketServer({ server: httpServer });

// Handle the server's "connection" event, which is received when a
// client attempts to connect to the WebSocket service. The |ws|
// parameter received by the callback is the WebSocket itself.

wss.on("connection", function connection(ws) {
  log("Incoming connection...");
  
  connectionArray.push(ws);
  ws.clientID = nextID;
  nextID++;
  
  // Tell the client that it's connected and send it its ID token. It will
  // send back its username in response.
  
  var msg = {
    type: "id",
    id: ws.clientID
  };
  ws.send(JSON.stringify(msg));
  
  // Handle the WebSocket's "message" event, which indicates a
  // JSON message has been received from a client.
  
  ws.on("message", function(message) {
    log("Message received:");
    log(message);

    // Convert the JSON back to an object and process it.
    
    var sendToClients = true;
    var msg = JSON.parse(message);
    var connect = getConnectionForID(msg.id);

    // Take a look at the incoming object and act on it based
    // on its type. Unknown message types are passed through,
    // since they may be used to implement client-side features.
    // Messages with a "target" property are sent only to a user
    // by that name.

    switch(msg.type) {
      // Public, textual message
      case "message":
        msg.name = connect.username;
        msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
        break;

      // Username change
      case "username":
        var nameChanged = false;
        var origName = msg.name;

        // Ensure the name is unique by appending a number to it
        // if it's not; keep trying that until it works.
        while (!isUsernameUnique(msg.name)) {
          msg.name = origName + appendToMakeUnique;
          appendToMakeUnique++;
          nameChanged = true;
        }

        // If the name had to be changed, we send a "rejectusername"
        // message back to the user so they know their name has been
        // altered by the server.
        
        if (nameChanged) {
          var changeMsg = {
            id: msg.id,
            type: "rejectusername",
            name: msg.name
          };
          connect.send(JSON.stringify(changeMsg));
        }

        // Set this connection's final username and send out the
        // updated user list to all users. Yeah, we're sending a full
        // list instead of just updating. It's horribly inefficient
        // but this is a demo. Don't do this in a real app.
        
        connect.username = msg.name;
        sendUserListToAll();
        sendToClients = false;  // We already sent the proper responses
        break;
    }

    // Convert the revised message back to JSON and send it out
    // to the specified client or all clients, as appropriate. We
    // pass through any messages not specifically handled
    // in the select block above. This allows the clients to
    // exchange signaling and other control objects unimpeded.

    if (sendToClients) {
      var msgString = JSON.stringify(msg);
      var i;

      // If the message specifies a target username, only send the
      // message to them. Otherwise, send it to every user.
      
      if (msg.target && msg.target !== undefined && msg.target.length !== 0) {
        sendToOneUser(msg.target, msgString);
      } else {
        for (i=0; i<connectionArray.length; i++) {
          connectionArray[i].send(msgString);
        }
      }
    }
  });
  
  // Handle the WebSocket "close" event; this means a user has logged off
  // or has been disconnected.
  
  ws.on('close', function(reason, description) {
    // First, remove the connection from the list of connections.
    
    connectionArray = connectionArray.filter(function(el, idx, ar) {
      return el.connected;
    });

    // Now send the updated user list. Again, please don't do this in a
    // real application. Your users won't like you very much.
    
    sendUserListToAll();

    // Build and output log output for close information.

    var logMessage = "Connection closed: " + ws.remoteAddress + " (" +
                     reason;
    if (description !== null && description.length !== 0) {
      logMessage += ": " + description;
    }
    logMessage += ")";
    log(logMessage);
  });

});
