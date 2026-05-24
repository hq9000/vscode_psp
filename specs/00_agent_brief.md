# VSCode PSP extension

## Overview

this is a live-music-coding extension for VSCode. User writes and re-writes the sound definition in a python file and sends updates to a sound generation server running in the background

## Workflow

* open a python file with `live.py` extension (this vscode extension is expected to fully cooperate with pylance, all the debugging, navigation stuff etc. stuff should work)
* press alt+r, which executes currently open python file and expects it to write some output a "last.rb" file (a ruby file with sonic-pi syntax)
* The contents of "last.rb" is then sent to sonic pi server running in the background.

* press alt+r - the signal to stop playback is sent to sonic pi


## Managing server

a server is automatically started whenever a file with "live.py" extension is open in the editor

## Additional information

Regarding managing the sonic server, check this repo to see how they do it (you don't need to copy this approach, only if you like it): https://github.com/s00500/vscode-sonic-pi

