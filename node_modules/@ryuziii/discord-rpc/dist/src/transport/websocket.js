"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
// WebSocket Transport for Discord RPC
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const errors_1 = require("../errors");
class WebSocketTransport extends events_1.EventEmitter {
    constructor(url = 'wss://rpc.discord.com/') {
        super();
        this.ws = null;
        this.url = url;
    }
    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new ws_1.default(this.url);
            this.ws.on('open', () => {
                this.emit('open');
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.emit('message', message.op, message.d);
                }
                catch (e) {
                    this.emit('error', new errors_1.DiscordRPCError('Failed to parse WebSocket message'));
                }
            });
            this.ws.on('error', (err) => {
                this.emit('error', new errors_1.DiscordRPCError('WebSocket connection error: ' + err.message));
                reject(err);
            });
            this.ws.on('close', () => this.emit('close'));
        });
    }
    send(op, data) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN)
            throw new errors_1.DiscordRPCError('WebSocket not connected');
        this.ws.send(JSON.stringify({ op, d: data }));
    }
    close() {
        this.ws?.close();
        this.ws = null;
    }
}
exports.WebSocketTransport = WebSocketTransport;
