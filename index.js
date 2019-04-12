const express = require("express");
const http = require("http");
const https = require("https");
const app = express();
const fs = require("fs");
const path = require("path");
const escapeHTML = require("escape-html");

let httpPort = 80;

const htmlTop = `<!doctype html>
<html>
<head>
	<meta http-equiv="Content-Type" content="text/html;charset=utf-8">
	<link href="/css/main.css" rel="stylesheet" media="screen" type="text/css">
	<title>MDN Code Samples</title>
</head>
<body>
<div class="page-wrapper">
  <div class="mdn-header">
    <h1>
      MDN Code Samples
    </h1>
  </div>
  <div class="mdn-content">
    <p>
      This site hosts <a href="https://github.com/mdn/samples-server/"> code samples</a>
      for MDN Web Docs that require server assistance to operate, such as examples for WebSocket,
      WebRTC, and other APIs.
    </p>
  </div>
  <div class="mdn-filelist">
  `;

  const htmlBottom = `</div>
  <div class="mdn-footer">
  All text content on MDN is offered under the
  <a href="http://creativecommons.org/licenses/by-sa/2.5/">CC-SA-BY</a> license,
  version 2.5 or later. All sample code offered on this site is provided under the
  <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 (Public
    Domain)</a> license and may be reused or repurposed without attribution.
  </div>
</div>
</body>
</html>`;

app.get("/", (request, response) => {
  let menuHTML = buildMenu("s");
  let html = htmlTop + "\r" + menuHTML + "\r" + htmlBottom;
  response.send(html);
});

app.use("/s", express.static(path.join(__dirname, "s")));
app.use("/css", express.static(path.join(__dirname, "css")));

// Try to load the key and certificate for HTTPS

let httpsOptions = {};

try {
  httpsOptions.key = fs.readFileSync("/etc/pki/tls/private/mdn-samples.mozilla.org.key");
  httpsOptions.cert = fs.readFileSync("/etc/pki/tls/certs/mdn-samples.mozilla.org.crt");
} catch(err) {
  console.error("Unable to load HTTPS cert and/or key; available on HTTP only: " + err);
  httpsOptions = null;
}

let httpServer = http.createServer(app);
httpServer.listen(httpPort);
httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    httpPort = 8888;
    httpServer = http.createServer(app);
    httpServer.listen(httpPort);
    console.log("Listening on port " + httpPort);
  } else {
    console.error("HTTP startup error: " + err);
  }
});

if (httpsOptions) {
  let httpServer = https.createServer(httpsOptions, app);
  httpServer.listen(443);
  console.log("HTTPS listening on port 443");
}

function readJSONFile(pathname) {
  const options = {
    encoding: "utf8"
  };

  try {
    let data = fs.readFileSync(pathname, options);
    const obj = JSON.parse(data);
    return obj;
  } catch(err) {
    console.error(`Error loading JSON data for file ${pathname}: ${err}`);
  }

  return null;
}

function buildMenuEntry(manifest) {
  let {name, docsUrl, description, pathname} = manifest;
  let docsLink = `[<a href="${docsUrl}">Documentation</a>]`;
  let dt = `<dt><a href="${pathname}">${name}</a></dt>`;
  let dd = `<dd>${escapeHTML(description)}&nbsp;${docsLink}</dd>`;
  output = dt+"\n"+dd+"\n";
  return output;
}

function buildMenuHTML(manifestList) {
  let output = "";

  manifestList.forEach(entry => {
    output += buildMenuEntry(entry);
  });
  return output;
}

function getManifestFromDirectory(pathname) {
  let manifestPath = `${pathname}${path.sep}manifest.json`;
  let manifest = readJSONFile(manifestPath);
  return manifest;
}

function compareManifests(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

function loadAllManifests(files, pathname) {
  let manifestList = [];

  files.forEach(entry => {
    if (entry.isDirectory()) {
      const entryPath = `${pathname}${path.sep}${entry.name}`;
      let manifest = getManifestFromDirectory(entryPath);
      if (manifest) {
        manifest.pathname = entryPath;
        manifestList.push(manifest);
      }
    }
  });
  return manifestList.sort(compareManifests);
}

function buildMenu(pathname) {
  let output = "";
  const readdirOptions = {
    encoding: "utf8",
    withFileTypes: true
  };
  
  try {
    let files = fs.readdirSync(pathname, readdirOptions);
    let manifestList = loadAllManifests(files, pathname);

    output = buildMenuHTML(manifestList);
  } catch(err) {
    console.error("Error reading directory: " + err);
    return null;
  }

  output = `<dl>\n${output}</dl>\n`;
  return output;
}
