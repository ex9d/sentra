"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonTemplates = exports.ActivityPresets = void 0;
exports.validateActivity = validateActivity;
function validateActivity(activity) {
    if (activity.details && activity.details.length > 128)
        throw new Error('Activity details too long');
    if (activity.state && activity.state.length > 128)
        throw new Error('Activity state too long');
    // Add more validation as needed
}
exports.ActivityPresets = {
    nowPlaying: (song, artist) => ({
        details: `Listening to ${song}`,
        state: artist ? `by ${artist}` : undefined,
        largeImageKey: 'music',
        largeImageText: 'Now Playing',
    }),
    inLobby: (game) => ({
        details: `In Lobby`,
        state: `Playing ${game}`,
        largeImageKey: 'lobby',
        largeImageText: 'Waiting for players',
    }),
    downloading: (file, percent) => ({
        details: `Downloading ${file}`,
        state: `Progress: ${percent}%`,
        largeImageKey: 'download',
        largeImageText: 'Downloading',
    }),
    timer: (label, seconds) => {
        const start = Date.now() / 1000;
        return {
            details: label,
            startTimestamp: start,
            endTimestamp: start + seconds,
            largeImageKey: 'timer',
            largeImageText: 'Timer',
        };
    },
};
exports.ButtonTemplates = {
    joinGame: (url) => ({ label: 'Join Game', url }),
    watchStream: (url) => ({ label: 'Watch Stream', url }),
    custom: (label, url) => ({ label, url }),
};
