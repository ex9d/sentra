import React, { useState, useEffect } from 'react'
import {
  Plus,
  Cookie,
  ShieldAlert,
  Loader2,
  LogIn,
  Info
} from 'lucide-react'
import { Dialog, DialogContent, DialogClose } from '@renderer/components/UI/dialogs/Dialog'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (cookie: string) => Promise<void> | void
}

const requestRobloxLoginCookie = async (): Promise<string> => {
  if (typeof window.api.openRobloxLoginWindow === 'function') {
    return window.api.openRobloxLoginWindow()
  }

  const ipc = (window.electron as any)?.ipcRenderer
  if (ipc?.invoke) {
    return ipc.invoke('open-roblox-login-window')
  }

  throw new Error('ROBLOX_LOGIN_UNAVAILABLE')
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [method, setMethod] = useState<'cookie' | 'browser'>('browser')

  const [cookie, setCookie] = useState('')
  const [isCookieBlurred, setIsCookieBlurred] = useState(true)

  const [browserLoginStatus, setBrowserLoginStatus] = useState<'idle' | 'waiting' | 'error'>('idle')
  const [browserLoginError, setBrowserLoginError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false)
      setMethod('browser')
      setBrowserLoginStatus('idle')
      setBrowserLoginError('')
      setIsCookieBlurred(true)
    } else {
      setCookie('')
      setIsCookieBlurred(true)
      setBrowserLoginStatus('idle')
      setBrowserLoginError('')
    }
  }, [isOpen])

  useEffect(() => {
    if (method !== 'browser') {
      setBrowserLoginStatus('idle')
      setBrowserLoginError('')
    }
  }, [method])

  const handleBrowserLogin = async () => {
    if (isLoading) return
    setBrowserLoginError('')
    setBrowserLoginStatus('waiting')
    setIsLoading(true)
    try {
      const cookieValue = await requestRobloxLoginCookie()
      await onAdd(cookieValue)
      onClose()
    } catch (error) {
      console.error('Failed to capture Roblox login:', error)
      setBrowserLoginStatus('error')
      if (error instanceof Error) {
        if (error.message === 'LOGIN_WINDOW_CLOSED') {
          setBrowserLoginError('Login window closed before completing sign-in.')
        } else if (error.message === 'ROBLOX_LOGIN_UNAVAILABLE') {
          setBrowserLoginError(
            'This build needs to be restarted to enable Roblox login. Please fully reload the app.'
          )
        } else {
          setBrowserLoginError('Failed to capture the Roblox session. Please try again.')
        }
      } else {
        setBrowserLoginError('Failed to capture the Roblox session. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cookie.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onAdd(cookie)
      setCookie('')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-[var(--accent-color-ring)]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              {method === 'cookie' ? (
                <Cookie size={20} className="text-neutral-300" />
              ) : (
                <LogIn size={20} className="text-neutral-300" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Add Account</h3>
              <p className="text-sm text-neutral-500">
                {method === 'cookie'
                  ? 'Import via Cookie'
                  : 'Official Roblox Login'}
              </p>
            </div>
          </div>
          <DialogClose disabled={isLoading && method === 'cookie'} />
        </div>

        {}
        <Tabs
          tabs={[
            { id: 'cookie', label: 'Cookie', icon: Cookie },
            { id: 'browser', label: 'Login / Code', icon: LogIn }
          ]}
          activeTab={method}
          onTabChange={(tabId) => setMethod(tabId as 'cookie' | 'browser')}
          layoutId="addAccountTabIndicator"
          tabClassName="pressable"
        />

        <div className="p-6">
          {method === 'cookie' ? (
            <form onSubmit={handleCookieSubmit} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 items-start">
                <ShieldAlert className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                <p className="text-s text-yellow-200/80 leading-relaxed">
                  Your security is important. Cookies are processed locally and encrypted.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="cookieInput" className="text-sm font-medium text-neutral-400">
                    .ROBLOSECURITY Cookie
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCookieBlurred((prev) => !prev)}
                    className="pressable text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {isCookieBlurred ? 'Show' : 'Hide'}
                  </button>
                </div>
                <textarea
                  id="cookieInput"
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  disabled={isLoading}
                  placeholder="_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-to-your-account-and-steal-your-ROBUX-and-items.|_..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all min-h-[120px] resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    isCookieBlurred
                      ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                      : undefined
                  }
                  autoFocus
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cookie.trim() || isLoading}
                  className="pressable flex-[2] flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span>{isLoading ? 'Importing...' : 'Import Account'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-left">
              <div className="bg-[var(--accent-color-faint)] border border-[var(--accent-color-border)] rounded-lg p-4 text-sm text-[var(--color-text-secondary)] flex items-start gap-3">
                <Info size={18} className="text-[var(--accent-color)] shrink-0 mt-0.5" />
                <p>
                  We&apos;ll open the official Roblox login page inside a sandboxed window. The
                  .ROBLOSECURITY cookie will be captured directly from Roblox.
                </p>
              </div>
              <div className="space-y-2 text-sm text-neutral-400">
                <p className="text-neutral-300 font-medium">How it works</p>
                <ul className="list-decimal list-inside space-y-1">
                  <li>Click &ldquo;Open Roblox Login&rdquo; to launch the official page.</li>
                  <li>Sign in inside the new window.</li>
                  <li>Once Roblox finishes, we import the account automatically.</li>
                </ul>
              </div>
              {browserLoginError && (
                <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {browserLoginError}
                </div>
              )}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBrowserLogin}
                  disabled={isLoading}
                  className="pressable flex-[2] flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  <span>{isLoading ? 'Waiting on Roblox...' : 'Open Roblox Login'}</span>
                </button>
              </div>
              {browserLoginStatus === 'waiting' && (
                <p className="text-sm text-neutral-400 text-center">
                  Login window is open. Complete the Roblox sign-in to continue.
                </p>
              )}
              <p className="text-xs text-neutral-500 text-center">
                The login session stays on your device and is cleared after the cookie is captured.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddAccountModal