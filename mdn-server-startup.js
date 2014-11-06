//
// MDN Server Startup
//

"use strict";

var fs = require("fs");
var sys = require("sys");
var exec = require("child_process").exec;
var spawn = require("child_process").spawn;

/////////////////////////
// Polyfill for bind() //
/////////////////////////

if (!Function.prototype.bind) { // check if native implementation available
  Function.prototype.bind = function(){
    var fn = this, args = Array.prototype.slice.call(arguments),
        object = args.shift();
    return function(){
      return fn.apply(object,
        args.concat(Array.prototype.slice.call(arguments)));
    };
  };
}

////////////////////////////
// Service handler object //
////////////////////////////


/**
 * An object representing a specific service.
 *
 * @param {String} path The service's directory.
 */
function Service(path) {
  this.path = path;
  this.manifestPath = path + "/manifest.json";
  this.env = process.env;
  this.running = false;
  this.child = null;
  this.diskPath = this.env["STACKATO_FILESYSTEM_DISK"];
  
  // Set up the startup log
  
  this.logPath = path.join(diskPath, "startup.log");
  this.log("*** LOG BEGINS ***\n");

  // Now load the service's manifest

  this.readManifestFile();
}

/**
 * Output text to the log file.
 *
 **/
Service.prototype.log = function(msg) {
  msg = "[" + Date.now().toLocaleString() + "] " + msg;
  fs.appendFile(this.logPath, msg);
};

/**
 * Read the contents of the specified file, parse it as JSON,
 * and call a handler to receive the output. This lets us load
 * asynchronously.
  */
Service.prototype.readManifestFile = function() {
  fs.readFile(this.manifestPath, "utf8", (function(err, data) {
    // Handle errors

    if (err) {
      this.log("Error reading manifest file " + this.manifestPath + ": " + err);
      return;
    }

    // We got a result; send it to the handler

    this.processManifest(data);
  }).bind(this));
};

/**
 * Called once a startup script has finished executing.
 *
 * @param  {Number} error  Whether or not an error occurred.
 * @param  {String} stdout The text sent to stdout by the script.
 * @param  {String} stderr The text sent to stderr by the script.
 */
Service.prototype.startupCallback = function(error, stdout, stderr) {
  if (!error) {
    // success! do nothing
    this.log(stdout);
    this.running = true;
  } else {
    this.log(stderr);
    this.running = false;
  }
};

/**
 * Handler that's called when a manifest has been loaded. Once the manifest
 * has been loaded, the startup.sh file within is executed.
 *
 * Receives the manifest's data as an object. This object contains the fields
 * from the manifest, including:
 *
 * name: The human-readable name of the service
 * docsUrl: An URL to the page on MDN that uses the sample. If multiple
 *          pages use this service, the primary one should be linked.
 * description: Descriptive text about the service.
 * ports: The number of ports the service needs.
 *

 * @param  {Object} manifest The manifest data.
 */
Service.prototype.processManifest = function(manifest) {
  var startupPath = this.path + "/startup.sh";
  var options;

  var numPorts = manifest.ports;

  if (fs.existsSync(startupPath)) {
    // Build an options object for the script spawn()

     options = {
      cwd: this.path,
      env: process.env,
      detached: true,
      stdio: "inherit"
     };

   // Start up the child process and detach it so it keeps
   // running after we exit.

   this.child = spawn(startupPath, [], options);
   this.child.unref();
  }
};

/**
 * Terminates the service, using the specified signal code.
 *
 * @param  {String|Number} signal The signal to use, as a string or number
 */
Service.prototype.kill = function(signal) {
  this.child.kill(signal);
};

//////////////////
// Main program //
//////////////////

function readdirCallback(error, files) {
  var i;
  var path;
  var stats;

  function statCallback(err, stats) {
    if (!err) {
      if (stats.isDirectory()) {
        var service;

        this.log("Starting service: " + path);
        service = new Service(path);
      }
    } else {
      this.log("Error getting attributes: " + path);
    }
  }

  if (error) {
    this.log("Error reading the service directory");
    return;
  }

  if (files.length) {
    for (i=0; i<files.length; i++) {
      path = process.cwd() + "/s/" + files[i];
      stats = fs.statSync(path);
      statCallback(0, stats);
    }
  }
}

fs.readdir(process.cwd() + "/s/", readdirCallback);
