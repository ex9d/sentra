/**
 * Macro types and interfaces.
 * Defines the structure and contracts for macro recording and playback.
 */

/**
 * Represents a single macro event (mouse or keyboard action).
 */
export interface MacroEvent {
  type: "mouse" | "keyboard";
  action: string;
  timestamp: number;
  x?: number;
  y?: number;
  key?: string;
  modifiers?: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
}

/**
 * Represents a complete macro (sequence of events).
 */
export interface Macro {
  id: string;
  name: string;
  description?: string;
  events: MacroEvent[];
  duration: number;
  createdAt: number;
  updatedAt: number;
  targetWindow?: string;
  loopCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Macro recording configuration.
 */
export interface MacroRecorderConfig {
  captureMouseMovement: boolean;
  captureMouseClicks: boolean;
  captureKeyboard: boolean;
  mouseMoveThrottleMs?: number;
  ignoreKeys?: string[];
}

/**
 * Macro playback configuration.
 */
export interface MacroPlaybackConfig {
  targetWindow?: string;
  speedMultiplier?: number;
  loopCount?: number;
  stopOnError?: boolean;
  eventDelayMs?: number;
}

/**
 * Macro recording state.
 */
export interface MacroRecordingState {
  isRecording: boolean;
  startTime: number;
  events: MacroEvent[];
  lastTimestamp: number;
}

/**
 * Macro playback state.
 */
export interface MacroPlaybackState {
  isPlaying: boolean;
  currentEventIndex: number;
  currentLoop: number;
  startTime: number;
  pausedTime?: number;
}

/**
 * Macro event callback types.
 */
export type MacroRecordingCallback = (
  state: MacroRecordingState,
  event: MacroEvent
) => void;
export type MacroPlaybackCallback = (
  state: MacroPlaybackState,
  event: MacroEvent
) => void;

/**
 * Playback result.
 */
export interface MacroPlaybackResult {
  success: boolean;
  totalEvents: number;
  eventsPlayed: number;
  duration: number;
  error?: Error;
}
