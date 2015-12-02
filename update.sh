#!/bin/bash
#
# Prepares the MDN Sample Server for use. This handles updating the
# operating system as well as pulling the latest Web content and
# sample code from github.
#
# It then calls the startup.py script to start each sample's
# background tasks as needed.
#
# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/

echo "Starting boot-time site update"

# Setting variables

COTURN_VERSION=4.5.0.3

# Get information we need about our server setup

PUBLIC_IP=$(curl --silent http://169.254.169.254/latest/meta-data/public-ipv4)
LOCAL_IP=$(curl --silent http://169.254.169.254/latest/meta-data/local-ipv4)

# Update existing software

echo "Updating system software..."
yum update -y

# Ensure that sshd is set up right and start it

chmod 711 /var/empty/sshd
chmod 600 /etc/ssh/*_key

echo "Starting SSH daemon..."
systemctl start sshd.service

# Pull the latest Web content, including the samples

echo "Updating Web site contents..."
cd /var/www/html && git pull

# Get the current version of adapter.js

echo "Updating adapter.js..."
curl https://webrtc.github.io/adapter/adapter-latest.js > /var/www/html/s/adapter.js

# Set owner of the web tree

chown -R root:www /var/www

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Files

find /var/www -type f -exec chmod 0664 {} +

# Make sure the web server is running

echo "Starting HTTP server..."
systemctl start  httpd.service
systemctl enable httpd.service

# Build, install, and start the turn server

echo "Downloading coturn $COTURN_VERSION (STUN/TURN server software)"
if [ -f /tmp/turnserver.tar.gz]; then
  rm /tmp/turnserver.tar.gz
fi
if [ -f /tmp/coturn-$COTURN_VERSION ]; then
  rm -r /tmp/coturn-$COTURN_VERSION
fi

if curl --silent --fail https://codeload.github.com/coturn/coturn/tar.gz/$COTURN_VERSION > /tmp/turnserver.tar.gz; then
  # Successful download -- build now
  pushd /tmp
  tar zxf turnserver.tar.gz
  cd /tmp/coturn-$COTURN_VERSION
  ./configure
  make install
  popd
else
  # Failed download -- decide what to do...
  echo "ERROR: Failed to download coturn (TURN/STUN server software)"
fi;

echo "Starting TURN/STUN server..."
turnserver --syslog -a -o -L $LOCAL_IP -X $PUBLIC_IP -E $LOCAL_IP -f --min-port=32355 --max-port=65535 --user=webrtc:turnserver -r mdnSamples --log-file=stdout -v

# Start spinning up Sample Server stuff here

echo "Starting service runner..."
/usr/bin/python /var/www/html/startup.py &
