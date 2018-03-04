"use strict";
class WebSocketServer {
    constructor(wsOpt) {
        this.express = require("express");
        this.http = require('http');
        this.WebSocket = require("ws");
        this.Crypto = require("crypto");
        this.clients = new Map();
        this.clientKeys = [];
        this.clientSyncStatus = true;
        this.connectionCounter = 0;
        this.domain = "";
        this.port = -1;
        console.log("SOCKET_SERVER::STARTING");
        this.initExpress();
        this.initHTTPServer();
        this.initWebSocketServer();
        this.initWebSocketConnection();
        this.HTTPServerListen();
    }
    send(shakey, data) {
        let ws = this.clients.get(shakey);
        ws.send(data);
    }
    syncStatus() {
        return this.clientSyncStatus;
    }
    initExpress() {
        this.app = this.express();
        this.app.use(function (req, res) {
            res.send("ws server up!!!");
        });
    }
    initHTTPServer() {
        this.server = this.http.createServer(this.app);
    }
    HTTPServerListen() {
        this.server.listen(8420, '0.0.0.0', function httpServerListening() {
            console.log("SOCKET_SERVER::LISTENING:", this.address().address + ":", this.address().port);
        });
    }
    initWebSocketServer() {
        this.wss = new this.WebSocket.Server({ server: this.server });
    }
    initWebSocketConnection() {
        let that = this;
        this.wss.on('connection', function socketConnect(ws, req) {
            that.connectionCounter++;
            let shakey = that.generateAssetSHA1({
                ip: that.server.address().address,
                port: that.server.address().port,
                count: that.connectionCounter
            });
            ws.key = shakey.hex;
            that.clients.set(shakey.hex, ws);
            that.clientKeys.push(shakey.hex);
            that.clientSyncStatus = false;
            console.log("SOCKET_SERVER::NEW_CONNECTION:", shakey.hex);
            ws.on('message', function socketMessage(message) {
                console.log(message);
                ws.send(message);
            });
            ws.on('close', function socketClose(message) {
                console.log(this.key);
                console.log(message);
            });
            ws.send(shakey.hex.toString());
        });
    }
    generateAssetSHA1(data) {
        let shaSum = this.Crypto.createHash("sha1");
        let shaReturn = "0";
        let shaIn = data.ip.toString()
            + data.port.toString()
            + data.count.toString();
        shaSum.update(shaIn);
        shaReturn = shaSum.digest("hex");
        return {
            hex: shaReturn,
            short: shaReturn.toString().substring(0, 10)
        };
    }
}
module.exports = WebSocketServer;
//# sourceMappingURL=websocketServer.js.map