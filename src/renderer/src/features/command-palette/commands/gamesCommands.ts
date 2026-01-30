import { CommandFactory } from './types'
import { JoinMethod } from '../../../types'

export const createGamesCommands: CommandFactory = (callbacks) => [
  {
    id: 'launch-place-id',
    label: 'Launch Game by Place ID',
    description: 'Join a game directly',
    icon: 'play',
    category: 'games',
    keywords: ['join', 'play'],
    requiresInput: true,
    inputPlaceholder: 'Enter place ID...',
    inputLabel: 'Place ID',
    onInputSubmit: (placeId) => {
      if (/^\d+$/.test(placeId)) {
        callbacks.onLaunchGame(JoinMethod.PlaceId, placeId)
      } else {
        callbacks.showNotification('Invalid place ID', 'error')
      }
    }
  },
  {
    id: 'launch-username',
    label: 'Join Player by Username',
    description: 'Join the game a player is in',
    icon: 'globe',
    category: 'games',
    keywords: ['follow', 'join'],
    requiresInput: true,
    inputPlaceholder: 'Enter username...',
    inputLabel: 'Username',
    onInputSubmit: (username) => {
      callbacks.onLaunchGame(JoinMethod.Username, username)
    }
  },
  {
    id: 'launch-job-id',
    label: 'Join Server by Job ID',
    description: 'Join specific server (PlaceID:JobID)',
    icon: 'hash',
    category: 'games',
    requiresInput: true,
    inputPlaceholder: 'PlaceID:JobID...',
    inputLabel: 'Place:Job',
    onInputSubmit: (target) => {
      if (target.includes(':')) {
        callbacks.onLaunchGame(JoinMethod.JobId, target)
      } else {
        callbacks.showNotification('Format: PlaceID:JobID', 'error')
      }
    }
  }
]
