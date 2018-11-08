let http = require('http');

class JsonRpc {

    constructor ({host, port, timeout = 30000}) {
        this.host = host;
        this.port = port;
        this.timeout = timeout;
    }

    request (method, parameters = {}) {
        return new Promise((resolve, reject) => {
            let time = Date.now();
            let requestJSON = JSON.stringify({
                jsonrpc: '2.0',
                id: time,
                method: method,
                params: parameters
            });

            // prepare request options
            let requestOptions = {
                host: this.host || 'localhost',
                port: this.port || 8888,
                method: 'POST',
                path: '/',
                headers: {
                    'Host': this.host || 'localhost',
                    'Content-Type': 'application/json',
                    'Content-Length': requestJSON.length
                },
                agent: false
            };

            // Now we'll make a request to the server
            let cbCalled = false;
            let request = http.request(requestOptions);

            // start request timeout timer
            let reqTimeout = setTimeout(function () {
                if (cbCalled) {
                    return;
                }
                cbCalled = true;
                request.abort();
                let err = new Error('ETIMEDOUT');
                err.code = 'ETIMEDOUT';
                reject(err);
            }, this.timeout);

            // set additional timeout on socket in case of remote freeze after sending headers
            request.setTimeout(this.timeout, function () {
                if (cbCalled) {
                    return;
                }
                cbCalled = true;
                request.abort();
                let err = new Error('ESOCKETTIMEDOUT');
                err.code = 'ESOCKETTIMEDOUT';
                reject(err);
            });

            request.on('error', function (err) {
                if (cbCalled) {
                    return;
                }
                cbCalled = true;
                clearTimeout(reqTimeout);
                reject(err);
            });

            request.on('response', function (response) {
                clearTimeout(reqTimeout);

                // We need to buffer the response chunks in a nonblocking way.
                let buffer = '';
                response.on('data', function (chunk) {
                    buffer = buffer + chunk;
                });
                // When all the responses are finished, we decode the JSON and
                // depending on whether it's got a result or an error, we call
                // emitSuccess or emitError on the promise.
                response.on('end', function () {
                    let err;

                    if (cbCalled) return;
                    cbCalled = true;

                    let decoded;

                    try {
                        decoded = JSON.parse(buffer);
                    } catch (e) {
                        if (response.statusCode !== 200) {
                            err = new Error('Invalid params, response status code: ' + response.statusCode);
                            err.code = -32602;
                            reject(err);
                        } else {
                            err = new Error('Problem parsing JSON response from server');
                            err.code = -32603;
                            reject(err);
                        }
                        return;
                    }

                    if (decoded.hasOwnProperty('error') && decoded.error != null) {
                        err = new Error(decoded.error.message || '');
                        if (decoded.error.code) {
                            err.code = decoded.error.code;
                        }
                        reject(err);
                    } else if (decoded.hasOwnProperty('result')) {
                        resolve(decoded.result);
                    } else {
                        reject(new Error('Malformed response'));
                    }
                });
            });
            request.end(requestJSON);
        });
    }
}

module.exports = JsonRpc;
