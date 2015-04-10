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

# Install packages needed for Web server support

yum groupinstall -y "Web Server" "PHP Support"
yum install -y nodejs
yum install -y npm

# Create a group for the Web content and add the default user to it

groupadd www
usermod -a -G www ec2-user

# Pull the latest sample server contents so we have a starting point

git clone https://github.com/a2sheppy/mdn-samples /var/www/html

# Pull the main startup script from github

curl https://raw.githubusercontent.com/a2sheppy/mdn-samples/master/update.sh > /usr/local/bin/update.sh
chmod +x /usr/local/bin/update.sh

# Create the service that will run the startup script on boot

# Run the startup script; this will update the operating system and
# system tools, then pull the latest code from Github

/usr/local/bin/update.sh
