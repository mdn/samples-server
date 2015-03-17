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
#
def startService(path):
  print("Starting service: " + path)
  
  startupScript = path + "/" + "startup.sh";
  if os.path.exists(startupScript):
    sys.stdout.flush()
    
    subprocess.Popen(["/bin/sh", startupScript], cwd = path)

homeDir = os.getcwd()
if not homeDir.endswith("/"):
  homeDir += "/"
serviceDir = homeDir + "s"

serviceList = os.listdir(serviceDir)

# For each directory in the service directory,
# call startService() to start it up.

for name in serviceList:
  if name[0] != '.':
    path = serviceDir + "/" + name
    if os.path.isdir(path):
      startService(path)

