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

# Set owner of the web tree

chown -R root:www /var/www

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Files

find /var/www -type f -exec chmod 0664 {} +

# Make sure the web server is running

systemctl start  httpd.service
systemctl enable httpd.service

# Start spinning up Sample Server stuff here

/bin/python /var/www/html/startup.py &
