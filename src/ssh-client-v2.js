'use strict';

module.exports = function (RED) {

    let options = null;
    let node = null;
    let client = null;

    function setOptions(msg, config) {
        let keyPath = config.privateKey ? config.privateKey : msg.privateKey;

        options = {
            host: config.hostname ? config.hostname : msg.hostname,
            port: config.port ? config.port: msg.port,
            username: node.credentials.username ? node.credentials.username : msg.username,
            password: node.credentials.password ? node.credentials.password : msg.password,
            privateKey: keyPath ? require('fs').readFileSync(keyPath) : undefined
        };
    }

    function _connectClient(callback){
        let SshClient = require('ssh2').Client;
        let hasError = false;

        // Ssh client handler
        client = new SshClient();
        client.on('ready', () => {
            node.debug("Ssh client ready");
            callback(client);
        });

        client.on('close', (err) => {
            if (err) {
                node.log('Ssh client was closed by error: ', err);
                node.status({ fill: "red", shape: "dot", text: 'Disconnected' });
            } else {
                node.debug('Ssh client was closed.', err);
                // FIXME: when the error callback below is called, this close callback
                //        doesn't have an error. This seems weird, but I don't know if
                //        it actually means we're doing something wrong.
                hasError || node.status({});
            }
        });

        // FIXME: when bad options are supplied (wrong hostname, port, etc) this
        //        callback is triggered, but `err` is undefined. Is that a problem
        //        with the `ssh2` library, or are we doing something wrong?
        client.on('error', (err) => {
            hasError = true;
            node.error('Ssh client error ', err);
            node.status({ fill: "red", shape: "dot", text: 'Error' });
        });

        client.connect(options);
    }

    function NodeRedSsh(config) {
        RED.nodes.createNode(this, config);
        node = this;
        node.config = config

        // Handle node close
        node.on('close', function () {
            node.debug('Ssh client dispose');
            client && client.close();
            client && client.dispose();
        });

        // Returns the object that the node outputs as its payload.
        // stdout/stderr are arrays, because if you run multiple commands,
        // e.g. `echo 'line one'; echo 'line two'`, each one will trigger
        // the callback that call `notify()`.
        let session = () => {
            return {
                exitCode: 0,
                stdout: [],
                stderr: [],
            }
        };

        let msg = session()

        let notify = (type, data) => {
            switch (type) {
                // Connection closed.
                case 0:
                    msg.exitCode = data;
                    node.send({payload: msg});
                    msg = session()
                    break;
                // stdout
                case 1:
                    msg.stdout.push(data.toString());
                    break;
                // stderr
                case 2:
                    msg.stderr.push(data.toString());
                    break;
            }
        };

        node.on('input', (msg) => {
               // If the message is a string, then we assume it's just the command.
            // Otherwise, we assume it's an object with a `command` attribute.
            if (typeof msg.payload === "string") {
                msg.payload = {command: msg.payload};
            }

            setOptions(msg.payload, node.config);

            node.debug("Getting client connection...");
            _connectClient((conn) => {
                conn.exec(msg.payload.command, (err, stream) => {
                    if (err) {
                        node.status({ fill: "red", shape: "dot", text: "Connection error" });
                        node.error(err);
                        throw err;
                    }
                    stream.on('close', function (code, signal) {
                        node.debug('Stream :: close :: code: ' + code + ', signal: ' + signal);
                        conn.end();
                        notify(0, code);
                    }).on('data', (data) => {
                        notify(1, data);
                    }).stderr.on('data', (data) => {
                        node.status({ fill: "red", shape: "dot", text: data.toString() });
                        notify(2, data);
                    });
                });
            });
        });

        node.debug("SSH-CLI setup done.");
    }

    // Register this node
    RED.nodes.registerType("ssh-client-v2", NodeRedSsh, {
        credentials: {
            email: { type: "text" },
            username: { type: "text" },
            password: { type: "password" }
        }
    });
}
