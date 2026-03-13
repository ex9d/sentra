"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/client");
const client = new client_1.DiscordRPCClient({
    clientId: 'YOUR_CLIENT_ID_HERE', // Replace with your Discord application's client ID
    transport: 'ipc', // or 'websocket'
});
client.on('ready', () => {
    console.log('Connected to Discord!');
    // Show a 30-second progress bar
    client.setProgressBar('Progressing...', 30, {
        state: 'Step 1/3',
        largeImageKey: 'progress',
        largeImageText: 'Progress Bar',
    });
    // You can still use setActivity for custom activities
    /*
    const activity: Activity = {
      details: 'Playing with @ryuzii-discord-rpc',
      state: 'Building a better RPC',
      largeImageKey: 'large_image',
      largeImageText: 'Large Image',
      smallImageKey: 'small_image',
      smallImageText: 'Small Image',
      startTimestamp: Date.now() / 1000,
    };
    client.setActivity(activity);
    */
});
client.on('activityUpdate', (data) => {
    console.log('Activity updated:', data);
});
client.on('disconnected', () => {
    console.log('Disconnected from Discord');
});
client.on('error', (err) => {
    console.error('Error:', err);
});
client.connect();
