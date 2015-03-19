#
# MDN Sample Server
# Start up samples as needed.
#

import os
import sys
import subprocess

#
# startService
#
# Given a path, start up the service contained in that directory.
# This is done by running the "startup.sh" script in each directory.
# The bash shell is used.
#
def startService(path):
  print("Starting service: " + path)
  
  startupScript = path + "/" + "startup.sh";
  if os.path.exists(startupScript):
    sys.stdout.flush()
    
    subprocess.Popen(["/bin/bash", startupScript], cwd = path)

#
# Main program
#

# Get the Web content directory, tack on "/s", and get a list of the
# contents of that directory

scriptDir = os.path.dirname(os.path.abspath(__file__))
if not scriptDir.endswith("/"):
  scriptDir += "/"
serviceDir = scriptDir + "s"

serviceList = os.listdir(serviceDir)

# For each directory in the service directory,
# call startService() to start it up.

for name in serviceList:
  if name[0] != '.':
    path = serviceDir + "/" + name
    if os.path.isdir(path):
      startService(path)

