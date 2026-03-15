import { ipcRenderer } from 'electron'
import { invoke } from './invoke'
import { z } from 'zod'

// ============================================================================
// MACRO API
// ============================================================================

const successSchema = z.object({ success: z.boolean() })
const eventsSchema = z.array(z.any())
const recordingProgressSchema = z.object({ eventCount: z.number(), duration: z.number() })
const isRecordingSchema = z.object({ isRecording: z.boolean() })
const macroSchema = z.any()

export const macroApi = {
  startRecording: () => invoke('macro:start-recording', successSchema),
  stopRecording: () => invoke('macro:stop-recording', z.object({ success: z.boolean(), events: z.array(z.any()) })),
  recordMouseMove: (x: number, y: number) => invoke('macro:record-mouse-move', successSchema, x, y),
  recordClick: (button?: 'left' | 'right' | 'middle') => invoke('macro:record-click', successSchema, button),
  recordKeyPress: (key: string) => invoke('macro:record-keypress', successSchema, key),
  saveMacro: (name: string, events: any[], description?: string) =>
    invoke('macro:save', z.object({ success: z.boolean(), macro: z.any() }), name, events, description),
  loadMacro: (macroId: string) => invoke('macro:load', z.object({ success: z.boolean(), macro: z.any().optional(), error: z.string().optional() }), macroId),
  listMacros: () => invoke('macro:list', z.object({ success: z.boolean(), macros: z.array(z.any()) })),
  deleteMacro: (macroId: string) => invoke('macro:delete', successSchema, macroId),
  playMacro: (macroId: string, speed?: number) => invoke('macro:play', z.object({ success: z.boolean(), error: z.string().optional() }), macroId, speed),
  isRecording: () => invoke('macro:is-recording', isRecordingSchema),
  getRecordingProgress: () => invoke('macro:get-recording-progress', recordingProgressSchema)
}
