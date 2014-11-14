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
var WebSocketServer = require('websocket/lib/WebSocketServer');

var port = process.env.stackato_harbor_websocket_chat_port;

var connectionArray = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

var server = http.createServer(function(request, response) {
    console.log((new Date()) + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(6502, function() {
    console.log((new Date()) + " Server is listening on port 6502");
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true
});

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

function sendUserListToAll() {
  var userListMsg = makeUserListMessage();
  var userListMsgStr = JSON.stringify(userListMsg);
  var i;

  for (i=0; i<connectionArray.length; i++) {
    connectionArray[i].sendUTF(userListMsgStr);
  }
}

wsServer.on('connect', function(connection) {
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

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);

            // Process messages

            var sendToClients = true;
            msg = JSON.parse(message.utf8Data);
            var connect = getConnectionForID(msg.id);

            switch(msg.type) {
              case "message":
                msg.name = connect.username;
                msg.text = msg.text.replace(/(<([^>]+)>)/ig,"");
                break;
              case "username":
                var nameChanged = false;
                var origName = msg.name;

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

                connect.username = msg.name;
                sendUserListToAll();
                break;
            }

            // Convert the message back to JSON and send it.

            if (sendToClients) {
              var msgString = JSON.stringify(msg);
              var i;

              for (i=0; i<connectionArray.length; i++) {
                connectionArray[i].sendUTF(msgString);
              }
            }
        }
    });
    connection.on('close', function(connection) {
      connectionArray = connectionArray.filter(function(el, idx, ar) {
              return el.connected;
      });
      sendUserListToAll();  // Update the user lists
      console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });
});
