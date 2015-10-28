//#!/usr/bin/env node

//
// WebSocket chat server
// Implemented using Node.js
//
// Requires the websocket module.
//

"use strict";

var http = require('http');
var url = require('url');
var fs = require('fs');
var websocket = require('websocket').server;

// Used for managing the text chat user list.

var connectionArray = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

// Stuff related to WebRTC video chats in progress.

var webrtc_chats = {};

// Our HTTP server does nothing but service WebSocket
// connections, so every request just returns 404. Real Web
// requests are handled by the main server on the box.

var server = http.createServer(function(request, response) {
    console.log((new Date()) + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(6503, function() {
    console.log((new Date()) + " Server is listening on port 6503");
});

// Create the WebSocket server

var wsServer = new websocket({
    httpServer: server,
    autoAcceptConnections: true // You should use false here!
});

function originIsAllowed(origin) {
  // This is where you put code to ensure the connection should
  // be accepted. Return false if it shouldn't be.
  return true;
}

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
// user, given their username.
function sendToOneUser(target, msgString) {
  var isUnique = true;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].username === target) {
      connectionArray[i].sendUTF(msgString);
      break;
    }
  }
}

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
    connectionArray[i].sendUTF(userListMsgStr);
  }
}

wsServer.on('connect', function(connection) {
//  if (!originIsAllowed(connection.origin)) {
//    request.reject();
//    console.log((new Date()) + "Connection from " + connection.origin + " rejected.");
//    return;
//  }
  
  console.log((new Date()) + " Connection accepted.");
  connectionArray.push(connection);

  // Send the new client its token; it will
  // respond with its login username.

  connection.clientID = nextID;
  nextID++;

  var msg = {
    type: "id",
    id: connection.clientID
  };
  connection.sendUTF(JSON.stringify(msg));

  // Handle the "message" event received over WebSocket. This
  // is a message sent by a client, and may be text to share with
  // other users or a command to the server.

  connection.on('message', function(message) {
      if (message.type === 'utf8') {
          console.log("Received Message: " + message.utf8Data);

          // Process incoming data.

          var sendToClients = true;
          msg = JSON.parse(message.utf8Data);
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
              msg.text = msg.text.replace(/(<([^>]+)>)/ig,"");
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

              if (nameChanged) {
                var changeMsg = {
                  id: msg.id,
                  type: "rejectusername",
                  name: msg.name
                };
                connect.sendUTF(JSON.stringify(changeMsg));
              }

              // Update the current username and send it along to
              // all users.
              connect.username = msg.name;
              sendUserListToAll();
              sendToClients = false;  // We already sent the proper responses
              break;
            
            /*
             * I don't think any of this should be needed, because these
             * messages should pass through and be handled client-side.
             *
            
            // Invite a user to join. We add the caller's username as the call
            // ID before sending the message along to the destination
            case "video-invite":
              msg.callID = connect.username;
              // *** send only to the user specified by msg.callee ***
              break;
              
            // Join (or create) a video call channel, identified by a callID
            // which is created by the channel creator and sent to the
            // callee.
            case "video-join":
              if (msg.callID !== undefined) {
                if (webrtc_chats[msg.callID] === undefined) { // New channel?
                  webrtc_chats[msg.callID] = {};
                }
                
                // Whether it's new or not, we now record that this call
                // is associated with this user's ID.
                
                webrtc_chats[msg.callID][connect.id] = true;
              }
              sendToClients = false;  // Nothing to send
              break;
          }
          
          */
          
          // Convert the revised message back to JSON and send it out
          // to the specified client or all clients, as appropriate. We
          // pass through any messages not specifically handled
          // in the select block above. This allows the clients to
          // exchange signaling and other control objects unimpeded.

          if (sendToClients) {
            var msgString = JSON.stringify(msg);
            var i;

            if (msg.target != undefined && msg.target.length != 0) {
              sendToOneUser(msg.target, msgString);
            } else {
              for (i=0; i<connectionArray.length; i++) {
                connectionArray[i].sendUTF(msgString);
              }
            }
          }
      }
  });
  
  // Handle the WebSocket "close" event; this means a user has logged off
  // or has been disconnected.
  
  connection.on('close', function(connection) {
    // First, remove the connection from the list of connections.
    
    connectionArray = connectionArray.filter(function(el, idx, ar) {
      return el.connected;
    });
    
    // Now find any WebRTC connections the user was connected to and
    // shut them down.
        
    Object.keys(webrtc_chats).forEach(function(callID) {
      Object.keys(webrtc_chats[callID]).forEach(function(connectID) {
        if (connectID == connection.id) {
          delete webrtc_chats[callID][connectID];
        }
      });
    });
    sendUserListToAll();  // Update the user lists
    console.log((new Date()) + " Peer disconnected.");
  });
});
