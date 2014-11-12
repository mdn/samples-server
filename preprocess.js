//
// Code that scans the manifests of all of the modules and
// prepares network ports and other resources that they need.
//
// This is run before the staging process occurs in order to
// configure settings that will be used by Stackato during
// staging.
//

"use strict";

var fs = require("fs");
var util = require("util");

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
