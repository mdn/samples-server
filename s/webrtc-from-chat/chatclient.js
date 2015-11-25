"use strict";

// WebSocket chat/signaling channel variables.

var connection = null;
var clientID = 0;

// The media constraints object describes what sort of stream we want
// to request from the local A/V hardware (typically a webcam and
// microphone). Here, we specify only that we want both audio and
// video; however, you can be more specific. It's possible to state
// that you would prefer (or require) specific resolutions of video,
// whether to prefer the user-facing or rear-facing camera (if available),
// and so on.
//
// See also:
// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
// 

var mediaConstraints = {
  audio: true,            // We want an audio track
  video: true             // ...and we want a video track
};

var myUsername = null;
var targetUsername = null;  // To store username of other peer
var myPeerConnection = null;    // RTCPeerConnection

// Output logging information to console

function log(text) {
  var time = new Date();
  
  console.log("[" + time.toLocaleTimeString() + "] " + text);
}

// Send a JavaScript object by converting it to JSON and sending
// it as a message on the WebSocket connection.

function sendToServer(msg) {
  var msgJSON = JSON.stringify(msg);
  
  log("Sending '" + msg.type + "' message: " + msgJSON);
  connection.send(msgJSON);
}

// Called when the "id" message is received; this message is sent by the
// server to assign this login session a unique ID number; in response,
// this function sends a "username" message to set our username for this
// session.
function setUsername() {
  myUsername = document.getElementById("name").value;

  sendToServer({
    name: myUsername,
    date: Date.now(),
    id: clientID,
    type: "username"
  });
}

// Open and configure the connection to the WebSocket server.

function connect() {
  var serverUrl = "ws://" + window.location.hostname + ":6503";

  connection = new WebSocket(serverUrl, "json");

  connection.onopen = function(evt) {
    document.getElementById("text").disabled = false;
    document.getElementById("send").disabled = false;
  };

  connection.onmessage = function(evt) {
    var f = document.getElementById("chatbox").contentDocument;
    var text = "";
    var msg = JSON.parse(evt.data);
    log("Message received: ");
    console.dir(msg);
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
        myUsername = msg.name;
        text = "<b>Your username has been set to <em>" + myUsername + "</em> because the name you chose is in use.</b><br>";
        break;
      case "userlist":
        var ul = "";
        var i;
        
        var listElem = document.getElementById("userlistbox");
        
        // Remove all current list members. We could do this smarter,
        // by adding and updating users instead of rebuilding from
        // scratch but this will do for this sample.
        
        while (listElem.firstChild) {
          listElem.removeChild(listElem.firstChild);
        }
        
        // Add member names from the received list

        for (i=0; i < msg.users.length; i++) {
          var item = document.createElement("li");
          item.appendChild(document.createTextNode(msg.users[i]));
          item.addEventListener("click", invite, false);
          
          listElem.appendChild(item);
        }
        break;
      case "video-invite": // Invited to a video call
        acceptInvite(msg);
        break;
    
      // The other peer has accepted our request to begin a conversation,
      // so we can now send an official offer.
    
      case "video-accept":
        log("Call recipient has accepted request to negotiate");
        
        // Create an offer, set it as the description of our local media
        // (which configures our local media stream), then send the
        // description to the callee as an offer. This is a proposed media
        // format, codec, resolution, etc.
        
        log("---> Creating offer");
        myPeerConnection.createOffer().then(function(offer) {
          log("---> Creating new description object to send to remote peer");
          return myPeerConnection.setLocalDescription(offer);
        })
        .then(function() {
          log("---> Sending description to remote peer");
          sendToServer({
            name: myUsername,
            target: targetUsername,
            type: "new-description",
            sdp: myPeerConnection.localDescription
          });
        })
        .catch(reportError);
        break;
      
      // Signaling messages
      
      // A new SDP description has arrived, representing either an offer
      // (sent by the caller) or an answer (sent by the callee).
      case "new-description": {
        log("Received SDP description from remote peer");
        
        var desc = new RTCSessionDescription(msg.sdp);
      
        log("--> SDP payload found of type: " + desc.type);
        if (desc.type === "offer") {
          log("----> It's an OFFER");
          // Received an offer from the caller. We need to set the remote description
          // to this SDP payload so that our local WebRTC layer knows how to talk to
          // the caller.
          myPeerConnection.setRemoteDescription(desc).then(function () {
            log("------> Creating answer");
            // Now that we've successfully set the remote description, we need to
            // create an SDP answer; this SDP data describes the local end of our
            // call, including the codec information, options agreed upon, and so
            // forth.
            return myPeerConnection.createAnswer();
          })
          .then(function(answer) {
            log("------> Setting local description after creating answer");
            // We now have our answer, so establish that as the local description.
            // This actually configures our end of the call to match the settings
            // specified in the SDP.
            return myPeerConnection.setLocalDescription(answer);
          })
          .then(function() {
            log("Sending answer packet back to other peer");
            // We've configured our end of the call now. Time to send our
            // answer back to the caller so they know we're set up. That
            // should complete the process of starting up the call!
            sendToServer({
              name: myUsername,
              target: targetUsername,
              type: "new-description",
              sdp: myPeerConnection.localDescription
            });
          })
          .catch(reportError);
        } else if (desc.type === "answer") {
          log("----> It's an ANSWER");
          // We've received an answer which has the details we need in
          // order to exchange media with the other end, so configure
          // ourselves to match. Now we're talking to the callee!
          myPeerConnection.setRemoteDescription(desc).catch(reportError);
        } else {
          log("*** Unknown SDP payload type");
        }
        break;
      }
      
      // A new ICE candidate has been received from the other peer. Call
      // RTCPeerConnection.addIceCandidate() to send it along to the
      // local ICE framework.
      case "new-ice-candidate":
        log("Received ICE candidate from remote peer: " + JSON.stringify(msg.candidate));
        {
          var candidate = new RTCIceCandidate(msg.candidate);
          log("Adding candidate: " + JSON.stringify(candidate));
          myPeerConnection.addIceCandidate(candidate)
            .catch(reportError);
        }
        break;
      
      // The other end of the call has closed the call. Close our end, too.
      
      case "video-close":
        closeVideoCall(false);
        break;
      
      // Unknown message; output to console for debugging.
      
      default:
        console.error("Unknown message received:");
        console.error(msg);
    }

    if (text.length) {
      f.write(text);
      document.getElementById("chatbox").contentWindow.scrollByPages(1);
    }
  };
}

// Handles a click on the Send button (or pressing return/enter) by
// building a "message" object and sending it to the server.
function handleSendButton() {
  var msg = {
    text: document.getElementById("text").value,
    type: "message",
    id: clientID,
    date: Date.now()
  };
  sendToServer(msg);
  document.getElementById("text").value = "";
}

// Handler for keyboard events. This is used to intercept the return and
// enter keys so that we can call send() to transmit the entered text
// to the server.
function handleKey(evt) {
  if (evt.keyCode === 13 || evt.keyCode === 14) {
    if (!document.getElementById("send").disabled) {
      handleSendButton();
    }
  }
}

// Create the RTCPeerConnection which knows how to talk to our
// selected STUN/TURN server and then uses getUserMedia() to find
// our camera and microphone and add that stream to the connection for
// use in our video call. Then, we send the passed-in message object
// to the signaling server. This object is either an invitation to
// a call or answering a call.

function setupVideoCall(signalMessage) {
  log("Setting up a connection...");
  
  // Create an RTCPeerConnection which knows to use our chosen
  // STUN server.
  
  myPeerConnection = new RTCPeerConnection({
      iceServers: [     // Information about ICE servers - Use your own!
        {
          urls: "stun:52.5.80.241"   // A STUN server
        },
        {
          urls: "stun:stun.l.google.com:19302"
        },
        {
          urls: "turn:52.5.80.241",  // A TURN server
          username: "webrtc",
          credential: "turnserver"
        }
      ]
  });
  
  // Set up an |icecandidate| event handler which will forward
  // candiates created by our local ICE layer to the remote peer.
  
  myPeerConnection.onicecandidate = function(event) {
    log("*** icecandidate ***");
    if (event.candidate) {
      log("Outgoing ICE candidate: " + event.candidate.candidate);

      sendToServer({
        type: "new-ice-candidate",
        target: targetUsername,
        candidate: event.candidate
      });
    }
  };

  // Set up a handler which is called when a stream starts coming in
  // from the callee.
        
  myPeerConnection.onaddstream = function(event) {
    log("*** addstream ***");
    
    document.getElementById("received_video").srcObject = event.stream;
    document.getElementById("video-close").disabled = false;
  };
  
  // Set up a handler which is called when the remote end of the connection
  // removes its stream. We consider this the same as hanging up the call.
  // It could just as well be treated as a "mute".
  //
  // Note that currently, the spec is hazy on exactly when this and other
  // "connection failure" scenarios should occur, so sometimes they simply
  // don't happen.
  
  myPeerConnection.onnremovestream = function(event) {
    log("*** removestream ***");
    closeVideoCall(true);
  };
  
  // Set up an ICE connection state change event handler. This will detect
  // when the ICE connection is closed, failed, or disconnected.
  //
  // Note that currently, the spec is hazy on exactly when this and other
  // "connection failure" scenarios should occur, so sometimes they simply
  // don't happen.
  
  myPeerConnection.oniceconnectionstatechange = function(event) {
    log("*** RECEIVED ICE CONNECTION STATE CHANGE: " + myPeerConnection.iceConnectionState);
    
    switch(myPeerConnection.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        closeVideoCall(true);
        break;
    }
  };
  
  // Handle changes to the ICE gathering state. This lets us know what the
  // ICE engine is currently working on: "new" means no networking has happened
  // yet, "gathering" means the ICE engine is currently gathering candidates,
  // and "complete" means gathering is complete. Note that the engine can
  // alternate between "gathering" and "complete" repeatedly as needs and
  // circumstances change.
  myPeerConnection.onicegatheringstatechange = function(event) {
    log("*** RECEIVED ICE GATHERING STATE CHANGE: " + myPeerConnection.iceGatheringState);
  };
  
  // Set up a signaling state change event handler. This will detect when
  // the signaling connection is closed.
  //
  // Note that currently, the spec is hazy on exactly when this and other
  // "connection failure" scenarios should occur, so sometimes they simply
  // don't happen.
  
  myPeerConnection.onsignalingstatechange = function(event) {
    log("*** RECEIVED SIGNALING STATE CHANGE: " + myPeerConnection.signalingState);
    switch(myPeerConnection.signalingState) {
      case "closed":
        closeVideoCall(true);
        break;
    }
  };
                  
  // Start the process of connecting by requesting access to a
  // stream of audio and video from the local user's camera. This
  // returns a promise which when fulfilled provides the stream. At
  // that time, we attach the stream to the local stream's <video>
  // element, then add it to the RTCPeerConnection.

  navigator.mediaDevices.getUserMedia(mediaConstraints)
  .then(function(localStream) {
    log("Local video stream obtained");
    document.getElementById("local_video").src = window.URL.createObjectURL(localStream);
    document.getElementById("local_video").srcObject = localStream;
    
    log("  -- Calling myPeerConnection.addStream()");
    myPeerConnection.addStream(localStream);
    
    log("  -- Sending the signaling message now that gUM is done");
    sendToServer(signalMessage);
  })
  .catch(function(e) {
    // For some reason, getUserMedia has reported failure. The two most
    // likely scenarios are that the user has no camera and/or microphone
    // or that they declined to share their equipment when prompted. If
    // they simply opted not to share their media, that's not really an
    // error, so we won't present a message in that situation.
    log(e);
    switch(e.name) {
      case "NotFoundError":
        alert("Unable to open your call because no camera and/or microphone" +
              "were found.");
        break;
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert("Error opening your camera and/or microphone: " + e.message);
        break;
    }
  });
};

// Close the RTCPeerConnection and reset variables so that the user can
// make or receive another call if they wish. This is called both
// when the user hangs up, the other user hangs up, or if a connection
// failure is detected.
//
// If sendCloseMessage is true, we also send a "video-close" message to
// the other peer so they know to hang up their end too. This is needed
// since WebRTC is hazy on how to detect a terminated call.

function closeVideoCall(sendCloseMessage) {
  var remoteVideo = document.getElementById("received_video");
  var localVideo = document.getElementById("local_video");

  log("Closing the call");
  
  // Close the RTCPeerConnection
  
  if (myPeerConnection) {
    log("--> Closing the peer connection");

    // Disconnect all our event listeners; we don't want stray events
    // to interfere with the hangup while it's ongoing.
    
    myPeerConnection.onaddstream = null;
    myPeerConnection.onremovestream = null;
    myPeerConnection.onnicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    
    // Stop the videos
    
    remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    localVideo.srcObject.getTracks().forEach(track => track.stop());
    remoteVideo.src = null;
    localVideo.src = null;
    
    // Close the call
    
    myPeerConnection.close();
    myPeerConnection = null;
  }
  
  // Disable the hangup button
  
  document.getElementById("video-close").disabled = true;
  
  // If sendCloseMessage is true, ask the other end to hang up too.
  /*
  if (sendCloseMessage) {
    log("--> Asking the other end to close too");
    sendToServer({
      name: myUsername,
      target: targetUsername,
      type: "video-close"
    });
  }
*/
  targetUsername = null;
}

// Handle a click on an item in the user list by inviting the clicked
// user to video chat.

function invite(evt) {
  log("Starting to prepare an invitation");
  if (myPeerConnection !== null) {
    alert("You can't start a call because you already have one open!");
  } else {
    var clickedUsername = evt.target.textContent;
    
    // Don't allow users to call themselves, because weird.
    
    if (clickedUsername === myUsername) {
      alert("I'm afraid I can't let you talk to yourself. That would be weird.");
      return;
    }
    
    targetUsername = clickedUsername;
    log("Inviting user " + targetUsername);
    
  // Call setupVideoCall() to create the RTCPeerConnection and to
  // use getUserMedia() to obtain our local stream so that we're ready
  // to share when the negotiations are complete. We provide a
  // "video-invite" message, which is sent to the callee via the
  // signaling server once getUserMedia() is fulfilled successfully;
  // this message invites the callee to start ICE negotiations.
    
    log("Setting up connection to invite user: " + targetUsername);
    setupVideoCall({
      name: myUsername,
      type: "video-invite",
      target: targetUsername
    });
  }
}

// Accept an invitation to video chat. We configure our local settings,
// start up our media stream, and then send a message to the caller
// saying that we're ready to begin negotiating the media format for
// communication.

function acceptInvite(msg) {
  targetUsername = msg.name;
  
  // Call setupVideoCall() to create the RTCPeerConnection and to
  // use getUserMedia() to obtain our local stream so that we're ready
  // to share when the negotiations are complete. We provide a
  // "video-accept" message, which is sent to the callee through the
  // signaling server once getUserMedia() has been successfully
  // fulfilled; this message tells the caller that we're ready to
  // negotiate the media format through an ICE exchange.
  
  log("Starting to accept invitation from " + targetUsername);
  setupVideoCall({
    name: myUsername,
    target: targetUsername,
    type: "video-accept",
  });
}

// Handles reporting errors. Currently, we just dump stuff to console but
// in a real-world application, an appropriate (and user-friendly)
// error message should be displayed.

function reportError(errMessage) {
  console.error("***** Error " + errMessage.name + ": " + errMessage.message);
}
