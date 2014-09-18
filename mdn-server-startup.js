//
// MDN Server Startup
//

"use strict";

var fs = require("fs");
var sys = require("sys");
var exec = require("child_process").exec;

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
  this.running = false;

  // Now load the service's manifest

  this.readManifestFile();
}

/**
 * Read the contents of the specified file, parse it as JSON,
 * and call a handler to receive the output. This lets us load
 * asynchronously.
  */
Service.prototype.readManifestFile = function() {
  fs.readFile(this.manifestPath, "utf8", (function(err, data) {
    // Handle errors

    if (err) {
      console.log("Error reading manifest file " + this.manifestPath + ": " + err);
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
    console.info(stdout);
    this.running = true;
  } else {
    console.error(stderr);
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
 *

 * @param  {Object} manifest The manifest data.
 */
Service.prototype.processManifest = function(manifest) {
  var startupPath = manifest.name + "/startup.sh";

  if (fs.existsSync(startupPath)) {
   console.log("  Running startup script: " + startupPath);
   exec(startupPath, this.startupCallback);
  }
};


//////////////////
// Main program //
//////////////////

function readdirCallback(error, files) {
  var i;
  var path;

  function statCallback(err, stats) {
    if (!err) {
      if (stats.isDirectory()) {
        var service;

        console.log("Starting service: " + path);
        service = new Service(path);
      }
    } else {
      console.error("Error getting attributes: " + path);
    }
  }

  if (error) {
    console.error("Error reading the service directory");
    return;
  }

  if (files.length) {
    for (i=0; i<files.length; i++) {
      path = process.cwd() + "/s/" + files[i];
      fs.stat(path, statCallback);
    }
  }
}

fs.readdir(process.cwd() + "/s/", readdirCallback);
