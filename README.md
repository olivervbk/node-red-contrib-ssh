# node-red-contrib-ssh-v2
Available on NPM as <a href="https://www.npmjs.com/package/node-red-contrib-ssh-v2-reconnection">node-red-contrib-ssh-v2-reconnection</a>. Based on <a href="https://github.com/yroffin/node-red-contrib-ssh">node-red-contrib-ssh</a> which does not seem to be maintained. The original lacked the ability to reconnect to the SSH server, limiting its usability.

# Improvements from the original
- fix unusable ssh key config
- support reconnecting when node receives input
- put output in the payload field
- accept settings as input

# Usage
**Input:** `msg.payload` can either be a string, in which case it's interpreted as the command to execute, or it can be a JSON object with a `command` field and any options you want to specify. Options set on the node itself, using the GUI, will take precedence over any that are passed in as input.

Fields you can set:

- `command`: the only mandatory field
- `hostname`
- `port`
- `privateKey`
- `username`
- `password`

**Output:** `message.payload` contains an object with the following fields:

- `exitCode`: the command's exit code
- `stdout`
- `stderr`

## Configuration
- Name: name of the node
- Private Key: ssh key path (optional but recommended)
- Hostname: address of the target SSH server
- Username: username of the target SSH server
- Password: password of the target SSH server (set this if not using ssh key)

# To-Do (help wanted)
1. Add feature to reuse hosts/accounts instead of having to re-add every time
~~1. Add output so that other nodes can consume the result~~
~~1. Add option to consume more information(e.g. hostname) from other node~~
