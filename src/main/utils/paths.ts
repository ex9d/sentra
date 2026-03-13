import { app } from 'electron'
import { join } from 'path'

/**
 * Returns a directory where the application should store its data.
 *
 * We use the standard userData directory on all platforms for app-specific data.
 */
import fs from 'fs'

export function getDataPath(): string {
  // primary location: Documents/Sentra (as originally desired)
  const docPath = join(app.getPath('documents'), 'Sentra')
  try {
    if (!fs.existsSync(docPath)) {
      fs.mkdirSync(docPath, { recursive: true })
    }
    // try to touch a temp file to verify write access
    const testFile = join(docPath, '.sentra_write_test')
    fs.writeFileSync(testFile, '')
    fs.unlinkSync(testFile)
    return docPath
  } catch (e) {
    console.warn('[paths] Documents directory not writable, falling back to userData', e)
    const userDataPath = join(app.getPath('userData'), 'Sentra')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    return userDataPath
  }
}

/**
 * Helper for getting the full path to a file inside the data directory.
 */
export function getDataFile(...segments: string[]): string {
  return join(getDataPath(), ...segments)
}
