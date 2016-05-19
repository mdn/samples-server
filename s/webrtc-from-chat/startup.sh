#!/bin/sh
# WebSocket chat server
#
# WebSocket and WebRTC based multi-user chat sample with two-way video
# calling, including use of TURN if applicable or necessary.
#
# This file is the startup script, responsible for installing needed
# components and starting up the server itself.
#
# To read about how this sample works:  http://bit.ly/webrtc-from-chat
#
# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/

npm install websocket

npm install webrtc-adapter
cp node_modules/webrtc-adapter/out/adapter.js .

node chatserver.js
