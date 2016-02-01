#!/usr/bin/python
#
# MDN Sample Server
# Start up samples as needed.
#
# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/
#

import os
import sys
import subprocess
import pwd

#
# startService
#
# Given a path, start up the service contained in that directory.
# This is done by running the "startup.sh" script in each directory.
# The bash shell is used.
#
def startService(path):
  print("Starting service: " + path)
  
  startupScript = path + "/" + "startup.sh"
  if os.path.exists(startupScript):
    sys.stdout.flush()
    
#    pw_record = pwd.getpwnam("apache")
    
#    env = os.environ.copy()
#    env['HOME'] = pw_record.pw_dir
#    env['LOGNAME'] = pw_record.pw_name
#    env['PWD'] = path
#    env['USER'] = pw_record.pw_name
    
    process = subprocess.Popen(
#      ["/bin/bash", startupScript], cwd = path, env = env, preexec_fn=demoteUser(pw_record.pw_uid, pw_record.pw_gid)
      ["/bin/bash", startupScript], cwd = path
    )
    
    # TODO: At some point we should record process IDs for restarts/shutdowns/etc

#
# demoteUser
#
# Downgrade to execute the process using the specified user ID and group ID.
#
def demoteUser(user_uid, user_gid):
  def result():
    os.setgid(user_gid)
    os.setuid(user_uid)
    
  return result

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

