/**
 * Macro Recorder implementation.
 * Captures mouse and keyboard events for macro recording.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode } from "../../shared/error/AppError";
import {
  MacroEvent,
  Macro,
  MacroRecorderConfig,
  MacroRecordingState,
  MacroRecordingCallback,
} from "../types/MacroTypes";
import { IMacroRecorder } from "../interfaces/MacroInterfaces";

export class MacroRecorder extends EventEmitter implements IMacroRecorder {
  private logger: Logger;
  private state: MacroRecordingState = {
    isRecording: false,
    startTime: 0,
    events: [],
    lastTimestamp: 0,
  };
  private config: MacroRecorderConfig = {
    captureMouseMovement: true,
    captureMouseClicks: true,
    captureKeyboard: true,
    mouseMoveThrottleMs: 50,
    ignoreKeys: ["CapsLock", "NumLock"],
  };
  private eventCallbacks: MacroRecordingCallback[] = [];
  private mouseMoveTimeout?: NodeJS.Timeout;

  constructor() {
    super();
    this.logger = new Logger("MacroRecorder");
  }

  /**
   * Start recording macro events.
   */
  public startRecording(config: Partial<MacroRecorderConfig> = {}): void {
    if (this.state.isRecording) {
      this.logger.warn("Recording already in progress");
      return;
    }

    this.config = { ...this.config, ...config };
    this.state = {
      isRecording: true,
      startTime: Date.now(),
      events: [],
      lastTimestamp: 0,
    };

    this.setupEventListeners();
    this.logger.info("Started recording macro", {
      config: this.config,
    });
    this.emit("recordingStarted");
  }

  /**
   * Stop recording and return the macro.
   */
  public stopRecording(): Macro | null {
    if (!this.state.isRecording) {
      this.logger.warn("Recording not in progress");
      return null;
    }

    this.teardownEventListeners();

    const duration = Date.now() - this.state.startTime;
    const macro: Macro = {
      id: `macro-${Date.now()}`,
      name: `Macro ${new Date().toLocaleString()}`,
      events: this.state.events,
      duration,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      loopCount: 1,
    };

    this.state.isRecording = false;
    this.logger.info("Stopped recording macro", {
      eventCount: this.state.events.length,
      duration,
    });

    this.emit("recordingStopped", macro);
    return macro;
  }

  /**
   * Cancel current recording.
   */
  public cancelRecording(): void {
    if (!this.state.isRecording) {
      return;
    }

    this.teardownEventListeners();
    this.state.isRecording = false;
    this.state.events = [];

    this.logger.info("Cancelled recording macro");
    this.emit("recordingCancelled");
  }

  /**
   * Check if currently recording.
   */
  public isRecording(): boolean {
    return this.state.isRecording;
  }

  /**
   * Register event callback.
   */
  public onEvent(callback: MacroRecordingCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventListeners(): void {
    if (typeof window !== "undefined") {
      // Browser environment
      if (this.config.captureMouseClicks) {
        window.addEventListener("mousedown", this.handleMouseEvent);
        window.addEventListener("mouseup", this.handleMouseEvent);
        window.addEventListener("click", this.handleMouseEvent);
      }
      if (this.config.captureMouseMovement) {
        window.addEventListener("mousemove", this.handleMouseMove);
      }
      if (this.config.captureKeyboard) {
        window.addEventListener("keydown", this.handleKeyEvent);
        window.addEventListener("keyup", this.handleKeyEvent);
      }
    }
  }

  private teardownEventListeners(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("mousedown", this.handleMouseEvent);
      window.removeEventListener("mouseup", this.handleMouseEvent);
      window.removeEventListener("click", this.handleMouseEvent);
      window.removeEventListener("mousemove", this.handleMouseMove);
      window.removeEventListener("keydown", this.handleKeyEvent);
      window.removeEventListener("keyup", this.handleKeyEvent);
    }

    if (this.mouseMoveTimeout) {
      clearTimeout(this.mouseMoveTimeout);
    }
  }

  private handleMouseEvent = (event: MouseEvent): void => {
    if (!this.state.isRecording) return;

    const macroEvent: MacroEvent = {
      type: "mouse",
      action: event.type,
      timestamp: Date.now() - this.state.startTime,
      x: event.clientX,
      y: event.clientY,
    };

    this.recordEvent(macroEvent);
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.state.isRecording || !this.config.captureMouseMovement) return;

    if (this.mouseMoveTimeout) {
      clearTimeout(this.mouseMoveTimeout);
    }

    this.mouseMoveTimeout = setTimeout(() => {
      const macroEvent: MacroEvent = {
        type: "mouse",
        action: "mousemove",
        timestamp: Date.now() - this.state.startTime,
        x: event.clientX,
        y: event.clientY,
      };

      this.recordEvent(macroEvent);
    }, this.config.mouseMoveThrottleMs);
  };

  private handleKeyEvent = (event: KeyboardEvent): void => {
    if (!this.state.isRecording || !this.config.captureKeyboard) return;

    if (
      this.config.ignoreKeys &&
      this.config.ignoreKeys.includes(event.key)
    ) {
      return;
    }

    const macroEvent: MacroEvent = {
      type: "keyboard",
      action: event.type,
      timestamp: Date.now() - this.state.startTime,
      key: event.key,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
    };

    this.recordEvent(macroEvent);
  };

  private recordEvent(event: MacroEvent): void {
    this.state.events.push(event);
    this.state.lastTimestamp = event.timestamp;

    this.eventCallbacks.forEach((callback) => {
      try {
        callback(this.state, event);
      } catch (error) {
        this.logger.error("Error in macro recording callback", error as Error);
      }
    });

    this.emit("eventRecorded", event);
  }
}
