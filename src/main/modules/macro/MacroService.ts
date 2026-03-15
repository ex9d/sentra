import { EventEmitter } from 'events'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getDataFile } from '../../utils/paths'

export type MacroEvent = {
  type: 'mousemove' | 'click' | 'keypress'
  x?: number
  y?: number
  button?: 'left' | 'right' | 'middle'
  key?: string
  delay?: number
}

export type Macro = {
  id: string
  name: string
  description?: string
  events: MacroEvent[]
  createdAt: number
  updatedAt: number
  timing: {
    totalDuration: number
    eventCount: number
  }
}

export class MacroService extends EventEmitter {
  private isRecording = false
  private currentEvents: MacroEvent[] = []
  private recordingStartTime = 0
  private lastEventTime = 0
  private macrosDir = getDataFile('macros')
  private builtInMacrosInitialized = false

  constructor() {
    super()
    this.ensureMacrosDir()
    // Don't initialize built-in macros here - do it lazily on first access
  }

  private ensureMacrosDir() {
    const fs = require('fs')
    if (!fs.existsSync(this.macrosDir)) {
      fs.mkdirSync(this.macrosDir, { recursive: true })
    }
  }

  /**
   * Built-in macro definitions for common Roblox actions
   * Work on all platforms including macOS where recording doesn't work well
   */
  private static readonly BUILT_IN_MACROS = [
    {
      name: 'Jump',
      description: 'Press spacebar to jump',
      events: [
        { type: 'keypress' as const, key: 'space', delay: 50 },
        { type: 'keypress' as const, key: 'space', delay: 0 }
      ]
    },
    {
      name: 'Move Forward',
      description: 'Press W to move forward',
      events: [
        { type: 'keypress' as const, key: 'w', delay: 100 },
        { type: 'keypress' as const, key: 'w', delay: 0 }
      ]
    },
    {
      name: 'Move Back',
      description: 'Press S to move back',
      events: [
        { type: 'keypress' as const, key: 's', delay: 100 },
        { type: 'keypress' as const, key: 's', delay: 0 }
      ]
    },
    {
      name: 'Move Left',
      description: 'Press A to move left',
      events: [
        { type: 'keypress' as const, key: 'a', delay: 100 },
        { type: 'keypress' as const, key: 'a', delay: 0 }
      ]
    },
    {
      name: 'Move Right',
      description: 'Press D to move right',
      events: [
        { type: 'keypress' as const, key: 'd', delay: 100 },
        { type: 'keypress' as const, key: 'd', delay: 0 }
      ]
    },
    {
      name: 'Sprint',
      description: 'Hold Shift for sprint',
      events: [
        { type: 'keypress' as const, key: 'shift', delay: 500 },
        { type: 'keypress' as const, key: 'shift', delay: 0 }
      ]
    },
    {
      name: 'Crouch',
      description: 'Press C to crouch',
      events: [
        { type: 'keypress' as const, key: 'c', delay: 100 },
        { type: 'keypress' as const, key: 'c', delay: 0 }
      ]
    },
    {
      name: 'Emote Dance 1',
      description: 'Press E for first emote',
      events: [
        { type: 'keypress' as const, key: 'e', delay: 100 },
        { type: 'keypress' as const, key: 'e', delay: 0 }
      ]
    }
  ]

  /**
   * Initialize built-in macros for common Roblox actions (lazy initialization)
   * CRITICAL FIX: Reads filesystem directly instead of calling listMacros() to avoid infinite recursion
   */
  private ensureBuiltInMacros(): void {
    if (this.builtInMacrosInitialized) {
      return
    }

    const fs = require('fs')
    const existingNames = new Set<string>()

    // Read existing macro names directly from filesystem (NOT via listMacros())
    if (fs.existsSync(this.macrosDir)) {
      try {
        const files = fs.readdirSync(this.macrosDir)
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const data = readFileSync(join(this.macrosDir, file), 'utf-8')
              const macro = JSON.parse(data) as Macro
              existingNames.add(macro.name)
            } catch (err) {
              // Silently ignore parse errors
            }
          }
        }
      } catch (err) {
        console.warn('[Macro] Error reading macros directory:', err)
      }
    }

    // Save any missing built-in macros
    for (const builtIn of MacroService.BUILT_IN_MACROS) {
      if (!existingNames.has(builtIn.name)) {
        console.log(`[Macro] Creating built-in macro: ${builtIn.name}`)
        this.saveMacro(builtIn.name, builtIn.events, builtIn.description)
      }
    }

    this.builtInMacrosInitialized = true
  }

  /**
   * Start recording a macro
   */
  startRecording(): void {
    if (this.isRecording) {
      console.warn('[Macro] Already recording')
      return
    }

    this.isRecording = true
    this.currentEvents = []
    this.recordingStartTime = Date.now()
    this.lastEventTime = this.recordingStartTime

    console.log('[Macro] Recording started')
    this.emit('recording-started')
  }

  /**
   * Stop recording and return recorded events
   */
  stopRecording(): MacroEvent[] {
    if (!this.isRecording) {
      console.warn('[Macro] Not recording')
      return []
    }

    this.isRecording = false
    const events = [...this.currentEvents]
    this.currentEvents = []

    console.log(`[Macro] Recording stopped with ${events.length} events`)
    this.emit('recording-stopped', events)

    return events
  }

  /**
   * Record a mouse movement
   */
  recordMouseMove(x: number, y: number): void {
    if (!this.isRecording) return

    const now = Date.now()
    const delay = Math.max(0, now - this.lastEventTime)
    this.lastEventTime = now

    this.currentEvents.push({
      type: 'mousemove',
      x,
      y,
      delay
    })
  }

  /**
   * Record a mouse click
   */
  recordClick(button: 'left' | 'right' | 'middle' = 'left'): void {
    if (!this.isRecording) return

    const now = Date.now()
    const delay = Math.max(0, now - this.lastEventTime)
    this.lastEventTime = now

    this.currentEvents.push({
      type: 'click',
      button,
      delay
    })
  }

  /**
   * Record a key press
   */
  recordKeyPress(key: string): void {
    if (!this.isRecording) return

    const now = Date.now()
    const delay = Math.max(0, now - this.lastEventTime)
    this.lastEventTime = now

    this.currentEvents.push({
      type: 'keypress',
      key,
      delay
    })
  }

  /**
   * Save a macro to file
   */
  saveMacro(name: string, events: MacroEvent[], description?: string): Macro {
    const id = `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    const totalDuration = events.reduce((sum, evt) => sum + (evt.delay || 0), 0)

    const macro: Macro = {
      id,
      name,
      description,
      events,
      createdAt: now,
      updatedAt: now,
      timing: {
        totalDuration,
        eventCount: events.length
      }
    }

    const filePath = join(this.macrosDir, `${id}.json`)
    writeFileSync(filePath, JSON.stringify(macro, null, 2))

    console.log(`[Macro] Saved macro "${name}" (${events.length} events, ${totalDuration}ms)`)
    this.emit('macro-saved', macro)

    return macro
  }

  /**
   * Load a macro by ID
   */
  loadMacro(macroId: string): Macro | null {
    const filePath = join(this.macrosDir, `${macroId}.json`)

    if (!existsSync(filePath)) {
      console.warn(`[Macro] Macro not found: ${macroId}`)
      return null
    }

    try {
      const data = readFileSync(filePath, 'utf-8')
      const macro = JSON.parse(data) as Macro
      console.log(`[Macro] Loaded macro "${macro.name}"`)
      return macro
    } catch (err) {
      console.error(`[Macro] Failed to load macro:`, err)
      return null
    }
  }

  /**
   * List all saved macros (including built-in macros on first call)
   */
  listMacros(): Macro[] {
    // Ensure built-in macros are created on first access
    this.ensureBuiltInMacros()

    const fs = require('fs')

    if (!fs.existsSync(this.macrosDir)) {
      return []
    }

    const files = fs.readdirSync(this.macrosDir)
    const macros: Macro[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = readFileSync(join(this.macrosDir, file), 'utf-8')
          const macro = JSON.parse(data) as Macro
          macros.push(macro)
        } catch (err) {
          console.error(`[Macro] Failed to parse ${file}:`, err)
        }
      }
    }

    return macros
  }

  /**
   * Delete a macro by ID
   */
  deleteMacro(macroId: string): boolean {
    const fs = require('fs')
    const filePath = join(this.macrosDir, `${macroId}.json`)

    if (!fs.existsSync(filePath)) {
      console.warn(`[Macro] Macro not found: ${macroId}`)
      return false
    }

    try {
      fs.unlinkSync(filePath)
      console.log(`[Macro] Deleted macro: ${macroId}`)
      this.emit('macro-deleted', macroId)
      return true
    } catch (err) {
      console.error(`[Macro] Failed to delete macro:`, err)
      return false
    }
  }

  /**
   * Play a macro to multiple windows
   * Note: Requires robotjs or similar library for actual input simulation
   */
  async playMacro(macro: Macro, targetWindowIds?: number[], speed: number = 1.0): Promise<void> {
    console.log(`[Macro] Starting playback: "${macro.name}" at ${speed}x speed`)
    this.emit('macro-started', macro.id)

    try {
      for (const event of macro.events) {
        const delayMs = Math.max(0, Math.round((event.delay || 0) / speed))

        // Simulate the input
        await this.simulateInput(event)

        // Wait before next event
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }

      console.log(`[Macro] Completed playback: "${macro.name}"`)
      this.emit('macro-completed', macro.id)
    } catch (err) {
      console.error(`[Macro] Playback error:`, err)
      this.emit('macro-error', { macroId: macro.id, error: String(err) })
    }
  }

  /**
   * Simulate input event using robotjs
   * Note: Requires external package for actual input simulation
   * Install: npm install robotjs
   * Then uncomment the code below
   */
  private async simulateInput(event: MacroEvent): Promise<void> {
    try {
      // IMPORTANT: To use actual input simulation, install robotjs and uncomment below:
      // npm install robotjs
      // 
      // Then uncomment this code:
      // const robot = require('robotjs')
      // 
      // if (event.type === 'mousemove') {
      //   robot.moveMouse(event.x!, event.y!)
      // } else if (event.type === 'click') {
      //   const button = event.button || 'left'
      //   if (button === 'left') {
      //     robot.click('left')
      //   } else if (button === 'right') {
      //     robot.click('right')
      //   } else if (button === 'middle') {
      //     robot.click('middle')
      //   }
      // } else if (event.type === 'keypress') {
      //   robot.typeString(event.key!)
      // }

      // For now, just log the event
      console.log(`[Macro] Would simulate: ${JSON.stringify(event)}`)
      console.log(`[Macro] Note: Install robotjs and uncomment simulateInput() to enable actual input`)
    } catch (err) {
      console.error(`[Macro] Input simulation error:`, err)
      console.warn(`[Macro] Install robotjs to enable input simulation: npm install robotjs`)
    }
  }

  /**
   * Get recording status
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  /**
   * Get current recording progress
   */
  getRecordingProgress(): { eventCount: number; duration: number } {
    return {
      eventCount: this.currentEvents.length,
      duration: Date.now() - this.recordingStartTime
    }
  }
}

export const macroService = new MacroService()
