/**
 * Macro Service - High-level API for macro operations.
 * Coordinates recording, playback, and persistence.
 */

import { promises as fs } from "fs";
import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import {
  Macro,
  MacroRecorderConfig,
  MacroPlaybackConfig,
  MacroPlaybackResult,
} from "../types/MacroTypes";
import { IMacroService } from "../interfaces/MacroInterfaces";
import { MacroRecorder } from "./MacroRecorder";
import { MacroPlayer } from "./MacroPlayer";

export class MacroService extends EventEmitter implements IMacroService {
  private logger: Logger;
  private recorder: MacroRecorder;
  private player: MacroPlayer;

  constructor() {
    super();
    this.logger = new Logger("MacroService");
    this.recorder = new MacroRecorder();
    this.player = new MacroPlayer();

    this.setupEventForwarding();
  }

  /**
   * Start recording a new macro.
   */
  public startRecording(config: MacroRecorderConfig): void {
    try {
      this.recorder.startRecording(config);
      this.emit("recordingStarted");
    } catch (error) {
      const appError = new AppError(
        "Failed to start recording",
        ErrorCode.MACRO_RECORD_ERROR,
        "MacroService",
        ErrorSeverity.MEDIUM,
        { error }
      );
      this.logger.error("Failed to start recording", error as Error);
      throw appError;
    }
  }

  /**
   * Stop recording and retrieve the macro.
   */
  public stopRecording(): Macro | null {
    const macro = this.recorder.stopRecording();
    if (macro) {
      this.emit("recordingStopped", macro);
    }
    return macro;
  }

  /**
   * Play a recorded macro.
   */
  public async playMacro(
    macro: Macro,
    config?: MacroPlaybackConfig
  ): Promise<MacroPlaybackResult> {
    try {
      if (!this.validateMacro(macro)) {
        throw new AppError(
          "Invalid macro format",
          ErrorCode.MACRO_INVALID_FORMAT,
          "MacroService"
        );
      }

      const result = await this.player.play(macro, config);
      this.emit("playbackCompleted", result);
      return result;
    } catch (error) {
      const appError = new AppError(
        "Failed to play macro",
        ErrorCode.MACRO_PLAYBACK_ERROR,
        "MacroService",
        ErrorSeverity.MEDIUM,
        { error }
      );
      this.logger.error("Failed to play macro", error as Error);
      throw appError;
    }
  }

  /**
   * Save macro to file.
   */
  public async saveMacro(macro: Macro, filePath: string): Promise<void> {
    try {
      if (!this.validateMacro(macro)) {
        throw new AppError(
          "Invalid macro format",
          ErrorCode.MACRO_INVALID_FORMAT,
          "MacroService"
        );
      }

      const json = JSON.stringify(macro, null, 2);
      await fs.writeFile(filePath, json, "utf-8");
      this.logger.info("Saved macro to file", { filePath });
      this.emit("macroSaved", { macro, filePath });
    } catch (error) {
      const appError = new AppError(
        "Failed to save macro",
        ErrorCode.MACRO_FILE_ERROR,
        "MacroService",
        ErrorSeverity.MEDIUM,
        { filePath, error }
      );
      this.logger.error("Failed to save macro", error as Error, {
        filePath,
      });
      throw appError;
    }
  }

  /**
   * Load macro from file.
   */
  public async loadMacro(filePath: string): Promise<Macro> {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const macro = JSON.parse(data) as Macro;

      if (!this.validateMacro(macro)) {
        throw new AppError(
          "Invalid macro format in file",
          ErrorCode.MACRO_INVALID_FORMAT,
          "MacroService",
          ErrorSeverity.MEDIUM,
          { filePath }
        );
      }

      this.logger.info("Loaded macro from file", { filePath });
      this.emit("macroLoaded", { macro, filePath });
      return macro;
    } catch (error) {
      const appError = new AppError(
        "Failed to load macro",
        ErrorCode.MACRO_FILE_ERROR,
        "MacroService",
        ErrorSeverity.MEDIUM,
        { filePath, error }
      );
      this.logger.error("Failed to load macro", error as Error, {
        filePath,
      });
      throw appError;
    }
  }

  /**
   * Cancel current playback.
   */
  public cancelPlayback(): void {
    this.player.cancel();
  }

  /**
   * Check if recording is in progress.
   */
  public isRecording(): boolean {
    return this.recorder.isRecording();
  }

  /**
   * Check if playback is in progress.
   */
  public isPlaying(): boolean {
    return this.player.isPlaying();
  }

  /**
   * Validate macro structure.
   */
  public validateMacro(macro: any): macro is Macro {
    if (!macro || typeof macro !== "object") {
      return false;
    }

    if (typeof macro.id !== "string" || typeof macro.name !== "string") {
      return false;
    }

    if (!Array.isArray(macro.events)) {
      return false;
    }

    if (typeof macro.duration !== "number") {
      return false;
    }

    if (typeof macro.createdAt !== "number") {
      return false;
    }

    // Validate events
    return macro.events.every(
      (event: any) =>
        event.type &&
        ["mouse", "keyboard"].includes(event.type) &&
        typeof event.action === "string" &&
        typeof event.timestamp === "number"
    );
  }

  private setupEventForwarding(): void {
    this.recorder.on("recordingStarted", () =>
      this.emit("recordingStarted")
    );
    this.recorder.on("recordingStopped", (macro: Macro) =>
      this.emit("recordingStopped", macro)
    );
    this.recorder.on("eventRecorded", (event) =>
      this.emit("eventRecorded", event)
    );

    this.player.on("playbackStarted", () =>
      this.emit("playbackStarted")
    );
    this.player.on("playbackCompleted", () =>
      this.emit("playbackCompleted")
    );
    this.player.on("eventPlayed", (event) =>
      this.emit("eventPlayed", event)
    );
    this.player.on("playbackError", (error) =>
      this.emit("playbackError", error)
    );
  }
}

/**
 * Singleton-like factory for MacroService with dependency injection.
 */
export class MacroServiceFactory {
  private static instance: MacroService | null = null;

  public static getInstance(): MacroService {
    if (!MacroServiceFactory.instance) {
      MacroServiceFactory.instance = new MacroService();
    }
    return MacroServiceFactory.instance;
  }

  public static createNew(): MacroService {
    return new MacroService();
  }

  public static reset(): void {
    MacroServiceFactory.instance = null;
  }
}
