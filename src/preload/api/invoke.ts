import { ipcRenderer } from 'electron'
import { z } from 'zod'

/**
 * Helper to validate IPC responses with Zod schemas
 */
export async function invoke<T>(
  channel: string,
  schema: z.ZodType<T>,
  ...args: unknown[]
): Promise<T> {
  const result = await ipcRenderer.invoke(channel, ...args)
  return schema.parse(result)
}
