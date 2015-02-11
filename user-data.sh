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

# Start up the Web server

systemctl start  httpd.service
systemctl enable httpd.service

# Create a group for the Web content and add the default user to it

groupadd www
usermod -a -G www ec2-user
mkdir /var/www/html
chown -R root:www /var/www
chmod 2775 /var/www

# Ensure that sshd is set up right and start it

chmod 711 /var/empty/sshd
chmod 600 /etc/ssh/*_key

systemctl start sshd.service &> /var/www/html/ssh-start.txt
systemctl status sshd.service > /var/www/html/ssh-status2.txt

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Files

find /var/www -type f -exec chmod 0664 {} +

# Start spinning up Sample Server stuff here

