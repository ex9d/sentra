/**
 * Macro Player implementation.
 * Plays back recorded macro events with timing accuracy.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import {
  Macro,
  MacroEvent,
  MacroPlaybackConfig,
  MacroPlaybackResult,
  MacroPlaybackState,
  MacroPlaybackCallback,
} from "../types/MacroTypes";
import { IMacroPlayer } from "../interfaces/MacroInterfaces";

export class MacroPlayer extends EventEmitter implements IMacroPlayer {
  private logger: Logger;
  private state: MacroPlaybackState | null = null;
  private currentMacro: Macro | null = null;
  private config: MacroPlaybackConfig = {
    speedMultiplier: 1.0,
    loopCount: 1,
    stopOnError: true,
  };
  private eventCallbacks: MacroPlaybackCallback[] = [];
  private playbackPromise: Promise<MacroPlaybackResult> | null = null;
  private shouldCancel: boolean = false;

  constructor() {
    super();
    this.logger = new Logger("MacroPlayer");
  }

  /**
   * Play a macro with the given configuration.
   */
  public async play(
    macro: Macro,
    config: MacroPlaybackConfig = {}
  ): Promise<MacroPlaybackResult> {
    if (this.state && this.state.isPlaying) {
      throw new AppError(
        "Playback already in progress",
        ErrorCode.MACRO_PLAYBACK_ERROR,
        "MacroPlayer",
        ErrorSeverity.MEDIUM
      );
    }

    if (!macro.events || macro.events.length === 0) {
      return {
        success: false,
        totalEvents: 0,
        eventsPlayed: 0,
        duration: 0,
        error: new AppError(
          "Macro has no events",
          ErrorCode.MACRO_INVALID_FORMAT,
          "MacroPlayer"
        ),
      };
    }

    this.currentMacro = macro;
    this.config = { ...this.config, ...config };
    this.shouldCancel = false;

    const result = await this.executePlayback();
    return result;
  }

  /**
   * Pause current playback.
   */
  public pause(): void {
    if (this.state && this.state.isPlaying) {
      this.state.pausedTime = Date.now();
      this.logger.info("Macro playback paused");
      this.emit("playbackPaused");
    }
  }

  /**
   * Resume paused playback.
   */
  public resume(): void {
    if (this.state && !this.state.isPlaying && this.state.pausedTime) {
      const pausedDuration = Date.now() - this.state.pausedTime;
      this.state.startTime += pausedDuration;
      this.state.pausedTime = undefined;
      this.logger.info("Macro playback resumed");
      this.emit("playbackResumed");
    }
  }

  /**
   * Cancel current playback.
   */
  public cancel(): void {
    this.shouldCancel = true;
    if (this.state) {
      this.state.isPlaying = false;
    }
    this.logger.info("Macro playback cancelled");
    this.emit("playbackCancelled");
  }

  /**
   * Check if currently playing.
   */
  public isPlaying(): boolean {
    return this.state?.isPlaying ?? false;
  }

  /**
   * Register event callback.
   */
  public onEvent(callback: MacroPlaybackCallback): void {
    this.eventCallbacks.push(callback);
  }

  private async executePlayback(): Promise<MacroPlaybackResult> {
    if (!this.currentMacro) {
      return {
        success: false,
        totalEvents: 0,
        eventsPlayed: 0,
        duration: 0,
        error: new AppError(
          "No macro loaded",
          ErrorCode.MACRO_PLAYBACK_ERROR,
          "MacroPlayer"
        ),
      };
    }

    const startTime = Date.now();
    let totalEventsPlayed = 0;

    try {
      const loopCount = this.config.loopCount ?? 1;

      for (let loop = 0; loop < loopCount; loop++) {
        if (this.shouldCancel) {
          break;
        }

        this.state = {
          isPlaying: true,
          currentEventIndex: 0,
          currentLoop: loop,
          startTime: Date.now(),
        };

        this.logger.info(`Starting playback loop ${loop + 1}/${loopCount}`);
        this.emit("playbackStarted", this.state);

        for (
          let i = 0;
          i < this.currentMacro.events.length;
          i++
        ) {
          if (this.shouldCancel) {
            break;
          }

          if (this.state.pausedTime) {
            await this.waitForResume();
          }

          const event = this.currentMacro.events[i];
          const nextEvent = this.currentMacro.events[i + 1];

          // Wait for timing
          if (nextEvent && i > 0) {
            const delay = nextEvent.timestamp - event.timestamp;
            const adjustedDelay = Math.ceil(
              delay / (this.config.speedMultiplier ?? 1.0)
            );
            await this.sleep(Math.max(0, adjustedDelay));
          }

          // Execute event
          await this.executeEvent(event);
          this.state.currentEventIndex = i + 1;
          totalEventsPlayed++;

          // Notify callbacks
          this.eventCallbacks.forEach((callback) => {
            try {
              callback(this.state!, event);
            } catch (error) {
              this.logger.error(
                "Error in playback callback",
                error as Error
              );
            }
          });

          this.emit("eventPlayed", event);
        }

        if (!this.shouldCancel) {
          this.logger.info(
            `Completed playback loop ${loop + 1}/${loopCount}`
          );
        }
      }

      const duration = Date.now() - startTime;

      if (this.state) {
        this.state.isPlaying = false;
      }

      this.logger.info("Macro playback completed successfully", {
        eventsPlayed: totalEventsPlayed,
        duration,
      });

      this.emit("playbackCompleted");

      return {
        success: !this.shouldCancel,
        totalEvents: this.currentMacro.events.length,
        eventsPlayed: totalEventsPlayed,
        duration,
      };
    } catch (error) {
      this.logger.error(
        "Macro playback failed",
        error instanceof Error ? error : new Error(String(error))
      );

      if (this.state) {
        this.state.isPlaying = false;
      }

      this.emit("playbackError", error);

      return {
        success: false,
        totalEvents: this.currentMacro.events.length,
        eventsPlayed: totalEventsPlayed,
        duration: Date.now() - startTime,
        error:
          error instanceof Error
            ? error
            : new Error(String(error)),
      };
    }
  }

  private async executeEvent(event: MacroEvent): Promise<void> {
    try {
      switch (event.type) {
        case "mouse":
          await this.executeMouse(event);
          break;
        case "keyboard":
          await this.executeKeyboard(event);
          break;
        default:
          this.logger.warn("Unknown event type", { type: event.type });
      }
    } catch (error) {
      if (this.config.stopOnError) {
        throw error;
      }
      this.logger.warn(
        "Event execution failed (continuing)",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async executeMouse(event: MacroEvent): Promise<void> {
    // In a real implementation, use mouse library or Electron APIs
    // This is a placeholder for event tracking
    if (event.x !== undefined && event.y !== undefined) {
      this.logger.debug("Mouse event", {
        action: event.action,
        x: event.x,
        y: event.y,
      });
    }
  }

  private async executeKeyboard(event: MacroEvent): Promise<void> {
    // In a real implementation, use keyboard library or Electron APIs
    // This is a placeholder for event tracking
    this.logger.debug("Keyboard event", {
      action: event.action,
      key: event.key,
      modifiers: event.modifiers,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.state?.pausedTime) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}
