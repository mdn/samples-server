#!/bin/bash
#
# This script is a once-per-instantiation script which is run the first time
# the MDN sample server instance is started up.
#
# Its job is to do the initial install of required software, make needed
# changes to the main user account, clone the site contents into place as
# a starting point, and install the script that should run at boot time.
# That script runs on every server startup, including at instantiation (in
# which case it happens after this instantiation-time script is complete).
#
# This script is based on this tutorial on the AWS docs site:
#    http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-LAMP.html
#
# On AWS, this should be pasted into the "User data" field in Step 3.
#
# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/
#

# Install packages needed for Web server support

yum groupinstall -y "Web Server" "PHP Support"
curl -sL https://rpm.nodesource.com/setup_10.x | sudo bash -
yum install -y nodejs
yum install -y npm
yum install -y openssl-devel
yum install -y sqlite-devel
yum install -y libevent-devel

# Create a group for the Web content and add the default user to it

groupadd www
usermod -a -G www ec2-user

# Pull the latest sample server contents so we have a starting point

git clone https://github.com/mdn/samples-server /var/www/html

# Allow only root to access the .git directory - DISABLED
# WHILE TRYING HTACCESS INSTEAD.

# chmod og-rwx /var/www/html/.git

# Pull the main startup script from github

curl https://raw.githubusercontent.com/mdn/samples-server/master/update.sh > /var/lib/cloud/scripts/per-boot/update.sh
chmod +x /var/lib/cloud/scripts/per-boot/update.sh

# Run the update script so it runs at instantiation time

echo "Starting update script..."
/usr/bin/bash /var/lib/cloud/scripts/per-boot/update.sh
