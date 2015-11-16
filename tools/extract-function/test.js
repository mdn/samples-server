var fs = require("fs");
//var process = require("process");
var fnExtractor = require("function-extractor");

var args = process.argv.slice(2);

if (args.length) {
  var src = fs.readFileSync(args[0], "utf8");
  var funcList = fnExtractor.parse(src);
  
  for (var i=0; i<funcList.length; i++) {
    console.log("Function " + i + ": " + funcList[i].name);
    console.log("Range: " + funcList[i].range);
    //console.log("BlockStart: " + funcList[i].blockStart);
    //console.log("End: " + funcList[i].end);
    //console.log("Loc: " + funcList[i].loc);
    console.log(src.slice(funcList[i].range[0], funcList[i].range[1]));
    console.log("----");
  }
} else {
  console.log("usage: test <filename> <funcname>");
}
