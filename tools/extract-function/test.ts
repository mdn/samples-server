import * as fs from "fs";
//var process = require("process");
const fnExtractor = require('function-extractor');

const args = process.argv.slice(2);

if (args.length) {
  const src = fs.readFileSync(args[0], 'utf8');
  const funcList = fnExtractor.parse(src);

  for (let i=0; i<funcList.length; i++) {
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
