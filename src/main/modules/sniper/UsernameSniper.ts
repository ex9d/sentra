import { EventEmitter } from 'events'
import { randomBytes } from 'crypto'
import https from 'https'

export interface UsernameSession {
  id: string;
  usernames: string[];
  checked: number;
  valid: string[];
  taken: string[];
  censored: string[];
  status: 'idle' | 'running' | 'paused' | 'completed';
  startTime?: number;
  endTime?: number;
  loopEnabled: boolean;
  loopCount: number;
  currentLoop: number;
  proxies: string[];
  currentProxyIndex: number;
  checkInterval: number; // ms between checks
}

export interface UsernameCheckResult {
  username: string;
  code: 0 | 1 | 2 | 10 | -1; // 0: valid, 1: taken, 2/10: censored, -1: error
  message?: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

export class UsernameSniperService extends EventEmitter {
  private sessions: Map<string, UsernameSession> = new Map();
  private runningSession: string | null = null;

  constructor() {
    super();
    // Set max listeners to avoid warnings
    this.setMaxListeners(100);
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private generateSessionId(): string {
    return randomBytes(8).toString('hex');
  }

  async createSession(usernames: string[], proxies: string[] = [], loopEnabled: boolean = false, loopCount: number = 1, checkInterval: number = 200): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: UsernameSession = {
      id: sessionId,
      usernames: usernames.filter(u => u.trim().length > 0),
      checked: 0,
      valid: [],
      taken: [],
      censored: [],
      status: 'idle',
      startTime: undefined,
      endTime: undefined,
      loopEnabled,
      loopCount,
      currentLoop: 0,
      proxies,
      currentProxyIndex: 0,
      checkInterval,
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  getSession(sessionId: string): UsernameSession | undefined {
    return this.sessions.get(sessionId);
  }

  async checkUsername(username: string, proxy?: string): Promise<UsernameCheckResult> {
    const cleaned = username.trim();

    if (!cleaned) {
      return {
        username,
        code: -1,
        message: 'Empty username',
      };
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await new Promise<UsernameCheckResult>((resolve, reject) => {
          const options: any = {
            hostname: 'auth.roblox.com',
            path: `/v1/usernames/validate?Username=${encodeURIComponent(cleaned)}&Birthday=2000-01-01`,
            method: 'GET',
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.roblox.com/',
              'Connection': 'keep-alive',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-site',
              'DNT': '1',
              'Cache-Control': 'no-cache',
            },
            timeout: 15000,
          };

          const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
              data += chunk;
            });

            res.on('end', () => {
              try {
                const response = JSON.parse(data);
                const code = response.code !== undefined ? response.code : -1;
                const message = response.message;

                if (attempt === 0) {
                  console.log(`[Sniper] ${cleaned}: code=${code}`);
                }

                resolve({
                  username: cleaned,
                  code: code as 0 | 1 | 2 | 10 | -1,
                  message,
              });
              } catch (parseErr) {
                resolve({
                  username: cleaned,
                  code: -1,
                  message: 'Failed to parse response',
                });
              }
            });
          });

          req.on('error', (error: any) => {
            lastError = error;
            reject(error);
          });

          req.setTimeout(15000, () => {
            req.destroy();
            lastError = new Error('Request timeout');
            reject(lastError);
          });

          req.end();
        });

        // If we got a successful response (non-error), return it
        if (result.code !== -1) {
          return result;
        }

        // If code is -1, it's a network error from the other side, retry
        lastError = new Error(result.message);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }

    return {
      username: cleaned,
      code: -1,
      message: lastError?.message || 'Max retries exceeded',
    };
  }

  // Proxy swapping disabled for now
  // private getNextProxy(session: UsernameSession): string | undefined {
  //   if (session.proxies.length === 0) return undefined;
  //   const proxy = session.proxies[session.currentProxyIndex];
  //   session.currentProxyIndex = (session.currentProxyIndex + 1) % session.proxies.length;
  //   return proxy;
  // }

  async startSniper(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (this.runningSession) {
      throw new Error('Another sniper session is already running');
    }

    this.runningSession = sessionId;
    session.status = 'running';
    session.startTime = Date.now();
    this.emit('status', { sessionId, status: 'running' });

    // Match Python's thread count (60 workers)
    const maxThreads = 60;

    // Loop sniping logic
    const loopTarget = session.loopEnabled ? session.loopCount : 1;

    for (let loop = 0; loop < loopTarget; loop++) {
      if (session.status !== 'running') break;

      session.currentLoop = loop + 1;
      session.checked = 0;
      session.valid = [];
      session.taken = [];
      session.censored = [];

      this.emit('loop-start', { sessionId, loopNumber: loop + 1, totalLoops: loopTarget });

      let activePromises = 0;

      for (const username of session.usernames) {
        // Wait if we have too many active promises
        while (activePromises >= maxThreads && session.status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (session.status !== 'running') {
          break;
        }

        activePromises++;

        // Don't use proxies for now
        this.checkUsername(username)
          .then(result => {
            session.checked++;

            if (result.code === 0) {
              session.valid.push(result.username);
              this.emit('valid', { sessionId, username: result.username });
            } else if (result.code === 1) {
              session.taken.push(result.username);
              this.emit('taken', { sessionId, username: result.username });
            } else if (result.code === 2 || result.code === 10) {
              session.censored.push(result.username);
              this.emit('censored', { sessionId, username: result.username });
            } else {
              // Only emit error if there are listeners, to avoid unhandled rejection
              if (this.listenerCount('error') > 0) {
                this.emit('error', { sessionId, username: result.username, message: result.message });
              }
            }

            this.emit('progress', { sessionId, checked: session.checked, total: session.usernames.length, loop: session.currentLoop, totalLoops: loopTarget });
          })
          .catch(err => {
            session.checked++;
            if (this.listenerCount('error') > 0) {
              this.emit('error', { sessionId, username, message: err.message });
            }
            this.emit('progress', { sessionId, checked: session.checked, total: session.usernames.length, loop: session.currentLoop, totalLoops: loopTarget });
          })
          .finally(() => {
            activePromises--;
          });

        // Random delay between requests (like Python: 0.05-0.3 seconds)
        const minDelay = 50; // Minimum 50ms to avoid being flagged
        const delay = Math.random() * Math.max(1, session.checkInterval - minDelay) + minDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Wait for remaining promises to complete
      while (activePromises > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (loop < loopTarget - 1 && session.status === 'running') {
        this.emit('loop-end', { sessionId, loopNumber: loop + 1, totalLoops: loopTarget });
        // Delay before next loop
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    session.status = 'completed';
    session.endTime = Date.now();
    this.runningSession = null;

    this.emit('completed', {
      sessionId,
      valid: session.valid.length,
      taken: session.taken.length,
      censored: session.censored.length,
      time: session.endTime - (session.startTime || 0),
      loops: session.currentLoop,
    });
  }

  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'running') {
      session.status = 'paused';
      this.emit('status', { sessionId, status: 'paused' });
    }
  }

  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'paused') {
      session.status = 'running';
      this.startSniper(sessionId).catch(() => {});
      this.emit('status', { sessionId, status: 'running' });
    }
  }

  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'idle';
      session.endTime = Date.now();
      if (this.runningSession === sessionId) {
        this.runningSession = null;
      }
      this.emit('status', { sessionId, status: 'stopped' });
    }
  }

  clearSession(sessionId: string): void {
    this.stopSession(sessionId);
    this.sessions.delete(sessionId);
  }

  getValidUsernames(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session?.valid || [];
  }
}

export default new UsernameSniperService();
