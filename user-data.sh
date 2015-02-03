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

# Now install needed Node packages

npm install ws

# Start up the Web server

systemctl start  httpd.service
systemctl enable httpd.service

# Create a group for the Web content and add the default user to it

groupadd www
usermod -a -G www ec2-user

# Fetch the site content from github and install it

wget git@github.com:a2sheppy/mdn-samples.git /tmp/mdn-samples.git
unzip /tmp/mdn-samples-master.zip 
rm -r /var/www
mv /tmp/mdn-samples-master /var/www/html

chown -R root:www /var/www
chmod 2775 /var/www

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Files

find /var/www -type f -exec chmod 0664 {} +

# Ensure that sshd is set up right and start it

chmod 711 /var/empty/sshd
chmod 600 /etc/ssh/*_key
systemctl start sshd.service

# Start spinning up Sample Server stuff here

#ls -l /var/empty > /var/www/html/output1.txt
#systemctl status sshd.service > /var/www/html/ssh-status1.txt
#ls -l /etc/ssh > /var/www/html/ssh-dir-listing.txt
#systemctl start sshd.service &> /var/www/html/ssh-start.txt
#systemctl status sshd.service > /var/www/html/ssh-status2.txt
