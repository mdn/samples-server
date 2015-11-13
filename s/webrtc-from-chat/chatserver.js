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

// If you want to implement support for blocking specific origins, this is
// where you do it. Just return false to refuse WebSocket connections given
// the specified origin.
function originIsAllowed(origin) {
  return true;    // We will accept all connections
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
      connectionArray[i].sendUTF(msgString);
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
    connectionArray[i].sendUTF(userListMsgStr);
  }
}

// Our HTTP server does nothing but service WebSocket
// connections, so every request just returns 404. Real Web
// requests are handled by the main server on the box. If you
// want to, you can return real HTML here and serve Web content.

var server = http.createServer(function(request, response) {
    console.log((new Date()) + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
});

// Spin up the HTTP server on the port assigned to this sample.
// This will be turned into a WebSocket port very shortly.

server.listen(6503, function() {
    console.log((new Date()) + " Server is listening on port 6503");
});

// Create the WebSocket server by converting the HTTP server into one.

var wsServer = new websocket({
    httpServer: server,
    autoAcceptConnections: true // You should use false here!
});

// Set up a "connect" message handler on our WebSocket server. This is
// called whenever a user connects to the server's port using the
// WebSocket protocol.
wsServer.on('connect', function(connection) {
  if (!originIsAllowed(connection.origin)) {
    request.reject();
    console.log((new Date()) + "Connection from " + connection.origin + " rejected.");
    return;
  }
  
  // Add the new connection to our list of connections.
  
  console.log((new Date()) + " Connection accepted.");
  connectionArray.push(connection);
  
  connection.clientID = nextID;
  nextID++;

  // Send the new client its token; it send back a "username" message to
  // tell us what username they want to use.

  var msg = {
    type: "id",
    id: connection.clientID
  };
  connection.sendUTF(JSON.stringify(msg));

  // Set up a handler for the "message" event received over WebSocket. This
  // is a message sent by a client, and may be text to share with other
  // users, a private message (text or signaling) for one user, or a command
  // to the server.

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

              // If the name had to be changed, we send a "rejectusername"
              // message back to the user so they know their name has been
              // altered by the server.
              if (nameChanged) {
                var changeMsg = {
                  id: msg.id,
                  type: "rejectusername",
                  name: msg.name
                };
                connect.sendUTF(JSON.stringify(changeMsg));
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
    
    // Now send the updated user list. Again, please don't do this in a
    // real application. Your users won't like you very much.
    sendUserListToAll();
    console.log((new Date()) + " Peer disconnected.");
  });
});
