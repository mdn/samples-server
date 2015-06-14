(function() {

  // Define "global" variables
  
  // Functions
  
  // Set things up, connect event listeners, etc.
  
  function startup() {
    var sendButton = document.getElementById('sendButton');
    
    sendButton.addEventListener('click', sendMessage, false);
  }
  
  function sendMessage(e) {
    console.log("Sending message: " + e);
  }
  
  // Set up an event listener which will run the startup
  // function once the page is done loading.
  
  window.addEventListener('load', startup, false);
})();
