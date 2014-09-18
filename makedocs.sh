#!/bin/bash

#
# Builds the documentation and stores it in the docs folder.
#

jsdoc mdn-server-startup.js README.md --destination docs
