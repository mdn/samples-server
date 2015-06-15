(function() {

  // Define "global" variables
  
  // Functions
  
  // Set things up, connect event listeners, etc.
  
  function startup() {
    var connectButton = document.getElementById('connectButton');
    var disconnectButton = document.getElementById('disconnectButton');
    var sendButton = document.getElementById('sendButton');
    
    // Set event listeners for user interface widgets
    
    connectButton.addEventListener('click', connectToPeer, false);
    sendButton.addEventListener('click', sendMessage, false);
  }
  
  // Connect to the remote peer.
  
  function connectToPeer() {
    
  }
  
  // Handles clicks on the "Send" button by transmitting
  // a message to the remote peer.
  
  function sendMessage() {
    console.log("Sending message");
  }
  
  // Set up an event listener which will run the startup
  // function once the page is done loading.
  
  window.addEventListener('load', startup, false);
})();
