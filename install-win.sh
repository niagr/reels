#!/bin/bash

# Installs Reels into C:/Program Files/Reels.
# Run with cygwin as admin. Needs the unzip package.
# This will not add the executable to PATH. Create a shorcut.

# Make install dir
mkdir /cygdrive/c/Program\ Files/Reels

# Copy everything except the 'bin' dir into install dir
cp -R `ls | grep -v bin` /cygdrive/c/Program\ Files/Reels/

# Deconpress the node-webkit package
unzip bin/node-webkit-v0.11.2-win-x64.zip -d bin

# Copy the node-webkit binaries into the install dir
cp -R bin/node-webkit-v0.11.2-win-x64/* /cygdrive/c/Program\ Files/Reels/

# Rename the 'nw' executable to 'reels'
mv /cygdrive/c/Program\ Files/Reels/nw /cygdrive/c/Program\ Files/Reels/reels

# Remove extracted files
rm -R bin/node-webkit-v0.11.2-win-x64/
