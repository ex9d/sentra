"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordRPCManager = exports.DiscordRPCClient = void 0;
const events_1 = require("events");
const ipc_1 = require("./transport/ipc");
const websocket_1 = require("./transport/websocket");
const errors_1 = require("./errors");
class DiscordRPCClient extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.transport = null;
        this.connected = false;
        this.reconnectTries = 0;
        this.maxReconnectTries = 5;
        this.reconnectDelay = 2000; // ms
        this.lastActivityTime = 0;
        this.minActivityInterval = 1500; // ms (Discord rate limit)
        this.imageKeys = new Set();
        this.activityQueue = [];
        this.activityQueueProcessing = false;
        this.animationInterval = null;
        this.schedulerTimeouts = [];
        this.rawEventHandlers = [];
        this.accessToken = null;
        this.options = options;
    }
    /**
     * Enable or disable auto-reconnect (default: enabled, 5 tries)
     */
    setAutoReconnect(enabled, maxTries = 5, delay = 2000) {
        this.maxReconnectTries = enabled ? maxTries : 0;
        this.reconnectDelay = delay;
    }
    /**
     * Set the minimum interval (ms) between activity updates (rate limiting)
     */
    setActivityRateLimit(ms) {
        this.minActivityInterval = ms;
    }
    /**
     * Set a progress bar by percent (0-100) for a given duration
     */
    setProgressPercent(label, percent, durationSeconds, activity = {}) {
        const now = Date.now() / 1000;
        const start = now - (percent / 100) * durationSeconds;
        const end = start + durationSeconds;
        this.setActivity({
            ...activity,
            details: label,
            startTimestamp: start,
            endTimestamp: end,
        });
    }
    // Override connect to add auto-reconnect logic
    async connect() {
        try {
            await this._connectInternal();
            this.reconnectTries = 0;
        }
        catch (err) {
            if (this.maxReconnectTries > 0 && this.reconnectTries < this.maxReconnectTries) {
                this.reconnectTries++;
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
            else {
                this.emit('error', err);
            }
        }
    }
    async _connectInternal() {
        if (this.options.transport === 'websocket') {
            this.transport = new websocket_1.WebSocketTransport();
        }
        else {
            this.transport = new ipc_1.IPCTransport();
        }
        this.transport.on('open', () => {
            this.connected = true;
            this.emit('ready');
        });
        this.transport.on('close', () => {
            this.connected = false;
            this.emit('disconnected');
            if (this.maxReconnectTries > 0 && this.reconnectTries < this.maxReconnectTries) {
                this.reconnectTries++;
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
        });
        this.transport.on('error', (err) => {
            this.emit('error', err);
        });
        this.transport.on('message', (op, data) => {
            this.emitRawEvent(op, data);
            if (data && data.cmd === 'SET_ACTIVITY') {
                this.emit('activityUpdate', data);
            }
        });
        await this.transport.connect();
        this.send(0, {
            v: 1,
            client_id: this.options.clientId,
        });
    }
    setActivity(activity) {
        const now = Date.now();
        if (now - this.lastActivityTime < this.minActivityInterval) {
            // Too soon, skip update
            return;
        }
        this.lastActivityTime = now;
        if (!this.connected || !this.transport)
            throw new errors_1.DiscordRPCError('Not connected');
        this.send(1, {
            cmd: 'SET_ACTIVITY',
            args: {
                pid: process.pid,
                activity,
            },
            nonce: this._nonce(),
        });
    }
    setProgressBar(label, durationSeconds, activity = {}) {
        const start = Date.now() / 1000;
        const end = start + durationSeconds;
        this.setActivity({
            ...activity,
            details: label,
            startTimestamp: start,
            endTimestamp: end,
        });
    }
    clearActivity() {
        if (!this.connected || !this.transport)
            throw new errors_1.DiscordRPCError('Not connected');
        this.send(1, {
            cmd: 'SET_ACTIVITY',
            args: {
                pid: process.pid,
            },
            nonce: this._nonce(),
        });
    }
    disconnect() {
        this.transport?.close();
        this.connected = false;
        this.emit('disconnected');
    }
    send(op, data) {
        this.transport?.send(op, data);
    }
    _nonce() {
        return Math.random().toString(36).slice(2) + Date.now();
    }
    /**
     * Register available image keys for validation and listing.
     */
    registerImageKeys(keys) {
        keys.forEach(key => this.imageKeys.add(key));
    }
    /**
     * Check if an image key is registered/valid.
     */
    isImageKeyValid(key) {
        return this.imageKeys.has(key);
    }
    /**
     * Get all registered image keys.
     */
    getImageKeys() {
        return Array.from(this.imageKeys);
    }
    /**
     * Queue an activity update. Will be sent respecting rate limits.
     */
    enqueueActivity(activity) {
        this.activityQueue.push(activity);
        this.processActivityQueue();
    }
    async processActivityQueue() {
        if (this.activityQueueProcessing)
            return;
        this.activityQueueProcessing = true;
        while (this.activityQueue.length > 0) {
            const activity = this.activityQueue.shift();
            if (activity)
                this.setActivity(activity);
            await new Promise(res => setTimeout(res, this.minActivityInterval));
        }
        this.activityQueueProcessing = false;
    }
    /**
     * Animate activity fields by cycling through a list of activities.
     * @param activities Array of activities to cycle through
     * @param intervalMs Interval between updates
     */
    animateActivity(activities, intervalMs = 5000) {
        if (this.animationInterval)
            clearInterval(this.animationInterval);
        let i = 0;
        this.animationInterval = setInterval(() => {
            this.setActivity(activities[i % activities.length]);
            i++;
        }, intervalMs);
    }
    /**
     * Stop activity animation.
     */
    stopAnimation() {
        if (this.animationInterval)
            clearInterval(this.animationInterval);
        this.animationInterval = null;
    }
    /**
     * Schedule an activity to be set at a specific time (UNIX timestamp in seconds).
     */
    scheduleActivity(activity, unixTime) {
        const delay = Math.max(0, unixTime * 1000 - Date.now());
        const timeout = setTimeout(() => this.setActivity(activity), delay);
        this.schedulerTimeouts.push(timeout);
    }
    /**
     * Clear all scheduled activities.
     */
    clearScheduledActivities() {
        this.schedulerTimeouts.forEach(t => clearTimeout(t));
        this.schedulerTimeouts = [];
    }
    /**
     * Register a handler for raw Discord events.
     */
    onRawEvent(handler) {
        this.rawEventHandlers.push(handler);
    }
    emitRawEvent(op, data) {
        this.rawEventHandlers.forEach(fn => fn(op, data));
    }
    /**
     * Set an OAuth2 access token for advanced features.
     */
    setAccessToken(token) {
        this.accessToken = token;
    }
    /**
     * Get the current OAuth2 access token.
     */
    getAccessToken() {
        return this.accessToken;
    }
}
exports.DiscordRPCClient = DiscordRPCClient;
class DiscordRPCManager {
    constructor() {
        this.clients = [];
    }
    addClient(options) {
        const client = new DiscordRPCClient(options);
        this.clients.push(client);
        return client;
    }
    getClients() {
        return this.clients;
    }
    disconnectAll() {
        this.clients.forEach(c => c.disconnect());
    }
}
exports.DiscordRPCManager = DiscordRPCManager;
