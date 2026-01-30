import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'




export function handle<T extends any[]>(
  channel: string,
  schema: z.ZodTuple<any, any>,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any>
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {

      const validated = schema.parse(args) as T
      return await handler(event, ...validated)
    } catch (err) {
      console.error(`IPC Validation Error on ${channel}:`, err)
      throw err
    }
  })
}