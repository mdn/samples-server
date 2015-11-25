#!/bin/bash
#
# Prepares the MDN Sample Server for use. This handles updating the
# operating system as well as pulling the latest Web content and
# sample code from github.
#
# It then calls the startup.py script to start each sample's
# background tasks as needed.

# Update existing software

yum update -y

# Ensure that sshd is set up right and start it

chmod 711 /var/empty/sshd
chmod 600 /etc/ssh/*_key

systemctl start sshd.service

# Pull the latest Web content, including the samples

cd /var/www/html && git pull

# Get the current version of adapter.js

curl https://webrtc.github.io/adapter/adapter-latest.js > /var/www/html/s/adapter.js

# Set owner of the web tree

chown -R root:www /var/www

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Files

find /var/www -type f -exec chmod 0664 {} +

# Make sure the web server is running

systemctl start  httpd.service
systemctl enable httpd.service

# Start the turn server

turnserver --syslog -a -o -L 172.31.45.0 -X 52.5.80.241 -E 172.31.45.0 -f --min-port=32355 --max-port=65535 --user=webrtc:turnserver -r mdnSamples --log-file=stdout -v

# Start spinning up Sample Server stuff here

/usr/bin/python /var/www/html/startup.py &
