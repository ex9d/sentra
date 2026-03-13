import fs from 'fs'
import crypto from 'crypto'

type KeyAuthOptions = {
  name: string
  ownerid: string
  version: string
  url?: string
  path?: string
}

type ApiResult = Record<string, any>

type Result<T = ApiResult> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string; details?: any }

export default class KeyAuthWrapper {
  private name: string
  private ownerid: string
  private version: string
  private url: string
  private path?: string

  private sessionid?: string
  private initialized = false

  public user_data: ApiResult | null = null
  public app_data: ApiResult | null = null

  constructor(opts: KeyAuthOptions) {
    if (!opts.name || !opts.ownerid || !opts.version) {
      throw new Error('name, ownerid and version are required')
    }
    this.name = opts.name
    this.ownerid = opts.ownerid
    this.version = opts.version
    this.url = opts.url ?? 'https://keyauth.win/api/1.3/'
    this.path = opts.path
  }

  private async __do_request(data: Record<string, any>): Promise<Result> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      })

      if (!res.ok) {
        return { ok: false, message: `HTTP error ${res.status}` }
      }

      const json = await res.json()
      return { ok: true, data: json }
    } catch (err: any) {
      return { ok: false, message: err?.message ?? String(err) }
    }
  }

  private tryParseNestedMessage(raw?: string): any | undefined {
    if (!raw || typeof raw !== 'string') return undefined
    const m = raw.match(/\(\s*\{([\s\S]*?)\}\s*\)/)
    if (!m) return undefined
    try {
      let inner = `{${m[1]}}`
      inner = inner.replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":').replace(/'/g, '"')
      return JSON.parse(inner)
    } catch {
      return undefined
    }
  }

  // HWID handling removed: KeyAuth manages device identification server-side.

  public async init(): Promise<Result> {
    if (this.sessionid && this.initialized) return { ok: true, data: { sessionid: this.sessionid } }

    let token = ''
    if (this.path) {
      try {
        token = fs.readFileSync(this.path, 'utf-8').trim()
      } catch (err) {
        // non-fatal: continue without token
      }
    }

    const post_data: Record<string, any> = {
      type: 'init',
      name: this.name,
      ownerid: this.ownerid,
      version: this.version
    }
    if (this.path && token) {
      post_data.token = token
      post_data.thash = crypto.createHash('sha256').update(token).digest('hex')
    }

    const r = await this.__do_request(post_data)
    if (!r.ok) {
      console.error('KeyAuth init request failed:', r.message)
      return r
    }
    
    const data = r.data as ApiResult
    if (typeof data === 'string' && data === 'KeyAuth_Invalid') return { ok: false, message: 'Application does not exist' }
    if (data.message === 'invalidver') return { ok: false, message: 'invalidver', details: data }
    if (data.success === false) return { ok: false, message: data.message ?? 'Init failed', details: data }
    
    // Safely extract sessionid
    if (!data.sessionid) {
      console.error('KeyAuth init response missing sessionid:', data)
      return { ok: false, message: 'Missing sessionid in response', details: data }
    }
    
    this.sessionid = data.sessionid
    this.initialized = true
    return { ok: true, data }
  }

  public async login(username: string, password: string, code?: string, hwid?: string): Promise<Result> {
    if (!this.initialized || !this.sessionid) return { ok: false, message: 'not initialized' }
    const post_data: any = {
      type: 'login',
      name: this.name,
      ownerid: this.ownerid,
      sessionid: this.sessionid,
      username,
      pass: password
    }
    if (hwid) post_data.hwid = hwid
    if (code) post_data.code = code

    const r = await this.__do_request(post_data)
    if (!r.ok) return r
    const data = r.data as ApiResult
    if (data.success === true) {
      this.user_data = data.info
      return { ok: true, data }
    }

    // parse nested messages if present
    const parsed = this.tryParseNestedMessage(data?.message)
    return { ok: false, message: data.message ?? 'login failed', details: parsed ?? data }
  }

  public async license(key: string, code?: string, hwid?: string): Promise<Result> {
    if (!this.initialized || !this.sessionid) return { ok: false, message: 'not initialized' }
    const post_data: any = {
      type: 'license',
      name: this.name,
      ownerid: this.ownerid,
      sessionid: this.sessionid,
      key
    }
    if (hwid) post_data.hwid = hwid
    if (code) post_data.code = code

    const r = await this.__do_request(post_data)
    if (!r.ok) return r
    const data = r.data as ApiResult
    if (data.success === true) {
      this.user_data = data.info
      return { ok: true, data }
    }

    // Detect ban/already-used status from message
    const message = data?.message ?? 'license failed'
    const lowerMsg = message.toLowerCase()
    let errorCode = 'unknown'
    if (lowerMsg.includes('ban')) errorCode = 'banned'
    else if (lowerMsg.includes('already') || lowerMsg.includes('used')) errorCode = 'already_used'
    else if (lowerMsg.includes('invalid')) errorCode = 'invalid_key'

    const parsed = this.tryParseNestedMessage(message)
    return { ok: false, message, code: errorCode, details: parsed ?? data }
  }

  public async fetchStats(): Promise<Result> {
    if (!this.initialized || !this.sessionid) return { ok: false, message: 'not initialized' }
    const post_data = { type: 'fetchStats', name: this.name, ownerid: this.ownerid, sessionid: this.sessionid }
    const r = await this.__do_request(post_data)
    if (!r.ok) return r
    const data = r.data as ApiResult
    if (data.success === true) {
      this.app_data = data.appinfo
      return { ok: true, data }
    }
    return { ok: false, message: data.message ?? 'fetchStats failed', details: data }
  }
}

export type { Result }
