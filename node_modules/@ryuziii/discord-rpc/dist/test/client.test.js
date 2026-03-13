"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/client");
describe('DiscordRPCClient', () => {
    it('should instantiate with options', () => {
        const client = new client_1.DiscordRPCClient({ clientId: 'test' });
        expect(client).toBeInstanceOf(client_1.DiscordRPCClient);
    });
    it('should have connect, setActivity, clearActivity, and disconnect methods', () => {
        const client = new client_1.DiscordRPCClient({ clientId: 'test' });
        expect(typeof client.connect).toBe('function');
        expect(typeof client.setActivity).toBe('function');
        expect(typeof client.clearActivity).toBe('function');
        expect(typeof client.disconnect).toBe('function');
    });
});
