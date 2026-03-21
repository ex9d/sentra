export interface SniperSession {
  id: string;
  usernames: string[];
  checked: number;
  valid: string[];
  taken: string[];
  censored: string[];
  status: 'idle' | 'running' | 'paused' | 'completed';
  startTime?: number;
  endTime?: number;
}

export interface UsernameCheckResult {
  username: string;
  code: 0 | 1 | 2 | -1; // 0: valid, 1: taken, 2: censored, -1: error
  message?: string;
}

export interface SniperConfig {
  maxThreads: number;
  delayMs: number;
  useProxy: boolean;
}
