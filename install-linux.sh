#!/bin/bash

# Installs Reels in a Linux system. Run with sudo.

# Create install dir in /opt
mkdir /opt/Reels

# Copy everything except the 'bin' dir into install dir
cp -R `ls | grep -v bin` /opt/Reels/

# Copy the node-webkit binaries into the install dir
cp -R bin/node-webkit-v0.11.2-linux-x64/* /opt/Reels

# Rename the 'nw' executable to 'reels'
mv /opt/Reels/nw /opt/Reels/reels

# Create symlink to 'reels' executable in install dir in /usr/local/bin
ln -s /opt/Reels/reels /usr/local/bin/
