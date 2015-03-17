#!/bin/bash
#
# This script is a once-per-instantiation script which is run the first time
# the MDN sample server instance is started up.
#
# This lets us do things like ensure that specific software is installed,
# as well as to spin-up needed background tasks.
#
# This script is based on this tutorial on the AWS docs site:
#    http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-LAMP.html
#

# Update existing software

yum update -y

# Install packages needed for Web server support

yum groupinstall -y "Web Server" "PHP Support"
yum install -y nodejs
yum install -y npm

# Create a group for the Web content and add the default user to it

groupadd www
usermod -a -G www ec2-user

# Ensure that sshd is set up right and start it

chmod 711 /var/empty/sshd
chmod 600 /etc/ssh/*_key

systemctl start sshd.service

# Pull the latest sample server contents

git clone https://github.com/a2sheppy/mdn-samples /var/www/html

# Set owner of the web tree

chown -R root:www /var/www

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Files

find /var/www -type f -exec chmod 0664 {} +

# Start up the Web server now that content is in place

systemctl start  httpd.service
systemctl enable httpd.service

# Start spinning up Sample Server stuff here

/bin/python /var/www/html/startup.py &
