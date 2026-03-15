/**
 * Macro service interfaces.
 */

import { MacroRecordingCallback, MacroPlaybackCallback } from "../types/MacroTypes";
import type { Macro, MacroRecorderConfig, MacroPlaybackConfig, MacroPlaybackResult } from "../types/MacroTypes";

export interface IMacroRecorder {
  startRecording(config: MacroRecorderConfig): void;
  stopRecording(): Macro | null;
  isRecording(): boolean;
  onEvent(callback: MacroRecordingCallback): void;
  cancelRecording(): void;
}

export interface IMacroPlayer {
  play(
    macro: Macro,
    config?: MacroPlaybackConfig
  ): Promise<MacroPlaybackResult>;
  pause(): void;
  resume(): void;
  cancel(): void;
  isPlaying(): boolean;
  onEvent(callback: MacroPlaybackCallback): void;
}

export interface IMacroService {
  startRecording(config: MacroRecorderConfig): void;
  stopRecording(): Macro | null;
  playMacro(
    macro: Macro,
    config?: MacroPlaybackConfig
  ): Promise<MacroPlaybackResult>;
  saveMacro(macro: Macro, filePath: string): Promise<void>;
  loadMacro(filePath: string): Promise<Macro>;
  cancelPlayback(): void;
  isRecording(): boolean;
  isPlaying(): boolean;
  validateMacro(macro: Macro): boolean;
}
