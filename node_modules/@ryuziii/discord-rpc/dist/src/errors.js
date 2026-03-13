"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordRPCSuggestionError = exports.DiscordRPCActivityError = exports.DiscordRPCConnectionError = exports.DiscordRPCError = void 0;
// Custom Error Classes for Discord RPC
class DiscordRPCError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscordRPCError';
    }
}
exports.DiscordRPCError = DiscordRPCError;
class DiscordRPCConnectionError extends DiscordRPCError {
    constructor(message) {
        super(message);
        this.name = 'DiscordRPCConnectionError';
    }
}
exports.DiscordRPCConnectionError = DiscordRPCConnectionError;
class DiscordRPCActivityError extends DiscordRPCError {
    constructor(message) {
        super(message);
        this.name = 'DiscordRPCActivityError';
    }
}
exports.DiscordRPCActivityError = DiscordRPCActivityError;
class DiscordRPCSuggestionError extends DiscordRPCError {
    constructor(message, suggestion) {
        super(`${message} (Suggestion: ${suggestion})`);
        this.name = 'DiscordRPCSuggestionError';
    }
}
exports.DiscordRPCSuggestionError = DiscordRPCSuggestionError;
