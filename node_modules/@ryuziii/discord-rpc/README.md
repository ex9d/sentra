# @ryuziii/discord-rpc

A modern, type-safe, and extensible Discord Rich Presence (RPC) library for Node.js and TypeScript. Better than the original, with robust error handling, activity templates, and cross-platform support.

## Features
- Modern TypeScript API
- IPC and WebSocket transport
- Strongly typed events and activity
- Custom error classes
- Auto-reconnect and extensibility
- Activity presets/templates
- Progress percent and queue helpers
- Button templates
- Presence animation and scheduler
- Multi-client support
- Raw event hooks
- OAuth2 integration

## Installation
```bash
npm install @ryuziii/discord-rpc
```

## Usage Examples
See the `examples/` folder for full code. Here are some highlights:

### TypeScript Import
```ts
import { DiscordRPCClient, ActivityPresets, ButtonTemplates, DiscordRPCManager } from '@ryuziii/discord-rpc';

const client = new DiscordRPCClient({ clientId: 'YOUR_CLIENT_ID', transport: 'ipc' });
client.on('ready', () => {
  client.setProgressBar('Progressing...', 30, { state: 'Step 1/3', largeImageKey: 'progress' });
});
client.connect();
```

### JavaScript Require
```js
const { DiscordRPCClient, ActivityPresets, ButtonTemplates, DiscordRPCManager } = require('@ryuziii/discord-rpc');

const client = new DiscordRPCClient({ clientId: 'YOUR_CLIENT_ID', transport: 'ipc' });
client.on('ready', () => {
  client.setProgressBar('Progressing...', 30, { state: 'Step 1/3', largeImageKey: 'progress' });
});
client.connect();
```

### Activity Presets & Button Templates
```ts
client.setActivity({
  ...ActivityPresets.nowPlaying('Never Gonna Give You Up', 'Rick Astley'),
  buttons: [ButtonTemplates.watchStream('https://youtube.com')],
});
```

### Queue & Progress Percent
```ts
for (let i = 1; i <= 5; i++) {
  client.enqueueActivity({ details: `Step ${i}/5`, state: 'Queued update', largeImageKey: 'queue' });
}
client.setProgressPercent('Loading...', 40, 60, { largeImageKey: 'progress' });
```

### Animation
```ts
const activities = [
  { details: 'First state', largeImageKey: 'anim1' },
  { details: 'Second state', largeImageKey: 'anim2' },
  { details: 'Third state', largeImageKey: 'anim3' },
];
client.animateActivity(activities, 3000);
```

### Scheduler
```ts
const now = Math.floor(Date.now() / 1000);
client.scheduleActivity({ details: 'Scheduled 1', largeImageKey: 'timer' }, now + 5);
client.scheduleActivity({ details: 'Scheduled 2', largeImageKey: 'timer' }, now + 10);
```

### Multi-Client
```ts
const manager = new DiscordRPCManager();
const client1 = manager.addClient({ clientId: 'CLIENT_ID_1', transport: 'ipc' });
const client2 = manager.addClient({ clientId: 'CLIENT_ID_2', transport: 'ipc' });
client1.connect();
client2.connect();
```

### Raw Event Hooks
```ts
client.onRawEvent((op, data) => {
  console.log('Raw event:', op, data);
});
```

## API Reference
See TypeScript types and JSDoc comments for full API. Highlights:
- `DiscordRPCClient` — main client class
- `DiscordRPCManager` — manage multiple clients
- `ActivityPresets`, `ButtonTemplates` — helpers for activities and buttons
- `setProgressBar`, `setProgressPercent`, `enqueueActivity`, `animateActivity`, `scheduleActivity`, etc.

## Troubleshooting
- **IPC not connecting?** Make sure Discord is running and you have the right client ID.
- **Images not showing?** Register your image keys in the Discord Developer Portal and use `registerImageKeys`.
- **Rate limited?** Use `setActivityRateLimit(ms)` to adjust update frequency.
- **Errors?** See error messages for suggestions, or use `on('error', handler)`.

## Contributing
PRs and issues welcome! Please add tests for new features.

## License
MIT 