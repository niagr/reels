#!/bin/bash

# Installs Reels in a Linux system. Run with sudo.

RUNTIME_DIR='runtime'
INSTALL_DIR='/opt/Reels'


if [ ! -d $RUNTIME_DIR ]; then
    echo "$RUNTIME_DIR directory doesn't exist. Exiting."
    exit 1
fi


# Create install dir in /opt
mkdir $INSTALL_DIR

# Copy required files into install dir
cp -R -t $INSTALL_DIR icons lib src package.json

# Copy the node-webkit binaries into the install dir
cp -R -t $INSTALL_DIR $RUNTIME_DIR/*

# Rename the 'nw' executable to 'reels'
mv $INSTALL_DIR/nw $INSTALL_DIR/reels

# Create symlink to 'reels' executable in install dir in /usr/local/bin
ln -s $INSTALL_DIR/reels /usr/local/bin/
