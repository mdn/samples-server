(function() {

  // Define "global" variables
  
  var connectButton = null;
  var disconnectButton = null;
  var sendButton = null;
  var messageInputBox = null;
  var receiveBox = null;
  
  var localConnection = null;   // RTCPeerConnection for our "local" connection
  var remoteConnection = null;  // RTCPeerConnection for the "remote"
  
  var sendChannel = null;       // RTCDataChannel for the local (sender)
  var receiveChannel = null;    // RTCDataChannel for the remote (receiver)
  
  // Functions
  
  // Set things up, connect event listeners, etc.
  
  function startup() {
    connectButton = document.getElementById('connectButton');
    disconnectButton = document.getElementById('disconnectButton');
    sendButton = document.getElementById('sendButton');
    messageInputBox = document.getElementById('message');
    receiveBox = document.getElementById('receivebox');
    
    // Set event listeners for user interface widgets
    
    connectButton.addEventListener('click', connectPeers, false);
    disconnectButton.addEventListener('click', disconnectPeers, false);
    sendButton.addEventListener('click', sendMessage, false);
  }
  
  // Connect the two peers. Normally you look for and connect to a remote
  // machine here, but we're just connecting two local objects, so we can
  // bypass that step.
  
  function connectPeers() {
    // Create the local connection and its data channel
    
    localConnection = new RTCPeerConnection();
    sendChannel = localConnection.createDataChannel("sendChannel");
    
    // Set up local event listeners
    
    localConnection.onicecandidate = localICECallback;
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;
    
    // Create the remote connection and its channel
    
    remoteConnection = new RTCPeerConnection();
    
    // Set up remote event listeners
    
    remoteConnection.onicecandidate = remoteICECallback;
    remoteConnection.ondatachannel = receiveChannelCallback;
    
    // Now create an offer to connect
    
    localConnection.createOffer(gotLocalDescription,
          handleCreateDescriptionError);
    
    // Update UI elements to reflect that the connection is in
    // the process of opening
    
    connectButton.disabled = true;
    disconnectButton.disabled = false;
  }
  
  // Callback executed when the createOffer() request for the
  // local connection is finished.
  
  function gotLocalDescription(theDescription) {
    localConnection.setLocalDescription(theDescription);
    
    // Since we're also the remote machine, we're going to
    // kick off the answer process here.
    
    remoteConnection.setRemoteDescription(theDescription);
    remoteConnection.createAnswer(gotRemoteDescription,
          handleCreateDescriptionError);
  }
  
  // Handle ICE callbacks for the local connection.
  
  function localICECallback(event) {
    if (event.candidate) {
      remoteConnection.addIceCandidate(event.candidate, handleAddCandidateSuccess,
              handleAddCandidateError);
    }
  }
  
  // Callback executed when the createAnswer() request for
  // the remote connection finishes up.
  
  function gotRemoteDescription(theDescription) {
    remoteConnection.setLocalDescription(theDescription);
    localConnection.setRemoteDescription(theDescription);
  }
  
  // Handle ICE callback for the remote connection.
  
  function remoteICECallback(event) {
    if (event.candidate) {
      localConnection.addIceCandidate(event.candidate,
              handleAddCandidateSuccess, handleAddCandidateError);
    }
  }
  
  // Handle errors attempting to create a description;
  // this can happen both when creating an offer and when
  // creating an answer. In this simple example, we handle
  // both the same way.
  
  function handleCreateDescriptionError(error) {
    console.log("Unable to create an offer: " + error.toString());
  }
  
  // Handle successful addition of ICE candidate.
  
  function handleAddCandidateSuccess() {
    console.log("Yay! addICECandidate succeeded!");
  }

  // Handle an error that occurs during addition of ICE candidate.
  
  function handleAddCandidateError() {
    console.log("Oh noes! addICECandidate failed!");
  }

  // Handles clicks on the "Send" button by transmitting
  // a message to the remote peer.
  
  function sendMessage() {
    var message = messageInputBox.value;
    sendChannel.send(message);
    
    // Clear the input box and re-focus it, so that we're
    // ready for the next message.
    
    messageInputBox.value = "";
    messageInputBox.focus();
  }
  
  // Handle status changes on the send channel.
  
  function handleSendChannelStatusChange() {
    if (sendChannel) {
      var state = sendChannel.readyState;
    
      if (sendChannel.readyState === "open") {
        messageInputBox.disabled = false;
        messageInputBox.focus();
        sendButton.disabled = false;
        disconnectButton.disabled = false;
        connectButton.disabled = true;
      } else {
        messageInputBox.disabled = true;
        sendButton.disabled = true;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
      }
    }
  }
  
  // Handle events that occur on the receiver's channel.
  
  function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
  }
  
  // Handle onmessage events for the receiving channel.
  // These are the data messages sent by the sending channel.
  
  function handleReceiveMessage(event) {
    var el = document.createElement("p");
    var txtNode = document.createTextNode(event.data);
    
    el.appendChild(txtNode);
    receiveBox.appendChild(el);
  }
  
  // Handle status changes on the receiver's channel.
  
  function handleReceiveChannelStatusChange() {
    if (receiveChannel) {
      console.log("Receive channel's status has changed to " +
                  receiveChannel.readyState);
    }
    
    // Here you would do stuff that needs to be done
    // when the channel's status changes.
  }
  
  // Close the connection, including data channels if they're open.
  // Also update the UI to reflect the disconnected status.
  
  function disconnectPeers() {
  
    // Close the RTCDataChannels if they're open.
    
    sendChannel.close();
    receiveChannel.close();
    
    // Close the RTCPeerConnections
    
    localConnection.close();
    remoteConnection.close();

    sendChannel = null;
    receiveChannel = null;
    localConnection = null;
    remoteConnection = null;
    
    // Update user interface elements
    
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    sendButton.disabled = true;
    
    messageInputBox.value = "";
    messageInputBox.disabled = true;
  }
  
  // Set up an event listener which will run the startup
  // function once the page is done loading.
  
  window.addEventListener('load', startup, false);
})();
