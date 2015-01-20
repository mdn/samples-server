#!/bin/bash
#
# This script is a once-per-instantiation script which is run the first time
# the MDN sample server instance is started up.
#
# This lets us do things like ensure that specific software is installed,
# as well as to spin-up needed background tasks.
#

# Update existing software

yum update -y

# Install packages needed for Web server support

yum groupinstall "Web Server" "MySQL Database" "PHP Support"'
yum install -y php-mysql

# Start up the Web server

service httpd start
chkconfig httpd on

# Create a group for the Web content and add the default user to it

usermod -a -G www ec2-user
chown -R root:www /var/www
chmod 2775 /var/www

# Update permissions of Web content: Directories

find /var/www -type d -exec chmod 2775 {} +

# Update permissions of Web content: Folders

find /var/www -type f -exec chmod 0664 {} +

# Start spinning up Sample Server stuff here

echo "<?php phpinfo(); ?>" /var/www/html/phpinfo.php
