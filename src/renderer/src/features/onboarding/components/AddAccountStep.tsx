import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, LogIn, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'
import { Account, AccountStatus } from '@renderer/types'

interface AddAccountStepProps {
  onAccountAdded: () => void
  onSkip: () => void
}

const requestRobloxLoginCookie = async (): Promise<string> => {
  return window.api.openRobloxLoginWindow()
}

const AddAccountStep: React.FC<AddAccountStepProps> = ({ onAccountAdded, onSkip }) => {
  const [method, setMethod] = useState<'cookie' | 'browser'>('browser')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cookie method state
  const [cookie, setCookie] = useState('')
  const [isCookieBlurred, setIsCookieBlurred] = useState(true)

  React.useEffect(() => {
    if (method === 'browser') {
      setError(null)
    }
  }, [method])

  const handleBrowserLogin = async () => {
    if (isLoading) return
    setError(null)
    setIsLoading(true)
    try {
      const cookieValue = await requestRobloxLoginCookie()
      await addAccountFromCookie(cookieValue)
    } catch (err: any) {
      console.error('Browser login failed:', err)
      if (err.message === 'LOGIN_WINDOW_CLOSED') {
        setError('Login window closed before completing sign-in.')
      } else {
        setError('Failed to capture the Roblox session.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cookie.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      await addAccountFromCookie(cookie)
    } catch {
      setError('Failed to add account. Please check the cookie.')
    } finally {
      setIsLoading(false)
    }
  }

  const addAccountFromCookie = async (cookieValue: string) => {
    const trimmed = cookieValue.trim()
    // Note: This is a known Roblox cookie prefix. If it changes, this will need to be updated.
    // Consider centralizing this as a constant if used in multiple places.
    const expectedStart =
      '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_'

    let actualCookieValue = trimmed
    const match = trimmed.match(/\.ROBLOSECURITY=([^;]+)/)
    if (match) actualCookieValue = match[1]

    if (!actualCookieValue.startsWith(expectedStart)) {
      throw new Error('Invalid cookie format')
    }

    const data = await window.api.validateCookie(cookieValue)
    const avatarUrl = await window.api.getAvatarUrl(data.id.toString())

    // Get existing accounts to check for duplicates
    const existingAccounts = await window.api.getAccounts()
    if (existingAccounts.some((acc: Account) => acc.id === data.id.toString())) {
      throw new Error('Account already added')
    }

    // Create the new account
    const newAccount: Account = {
      id: data.id.toString(),
      displayName: data.displayName,
      username: data.name,
      userId: data.id.toString(),
      cookie: actualCookieValue,
      status: AccountStatus.Offline,
      avatarUrl: avatarUrl,
      lastActive: '',
      robuxBalance: 0,
      friendCount: 0,
      followerCount: 0,
      followingCount: 0
    }

    // Save all accounts including the new one
    await window.api.saveAccounts([...existingAccounts, newAccount])

    setSuccess(true)
    setTimeout(() => {
      onAccountAdded()
    }, 500)
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Account Added!</h3>
        <p className="text-neutral-400 text-sm">Continuing to next step...</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { id: 'cookie', label: 'Cookie', icon: Cookie },
          { id: 'browser', label: 'Login / Code', icon: LogIn }
        ]}
        activeTab={method}
        onTabChange={(tabId) => {
          setError(null)
          setMethod(tabId as 'cookie' | 'browser')
        }}
        layoutId="onboardingAddAccountTab"
        tabClassName="pressable"
        className="-mx-6"
      />

      <AnimatePresence mode="wait">
        {method === 'cookie' && (
          <motion.div
            key="cookie"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={handleCookieSubmit} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 items-start">
                <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-yellow-200/80 leading-relaxed">
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
                  placeholder="_|WARNING:-DO-NOT-SHARE-THIS..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all min-h-[100px] resize-none font-mono disabled:opacity-50"
                  style={
                    isCookieBlurred
                      ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                      : undefined
                  }
                />
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <button
                type="submit"
                disabled={!cookie.trim() || isLoading}
                className="pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Cookie size={18} />}
                <span>{isLoading ? 'Importing...' : 'Import Account'}</span>
              </button>
            </form>
          </motion.div>
        )}

        {method === 'browser' && (
          <motion.div
            key="browser"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-100/90">
              <p>
                We&apos;ll open the official Roblox login page inside a sandboxed window. The
                session cookie will be captured securely.
              </p>
            </div>

            <div className="space-y-2 text-sm text-neutral-400">
              <p className="text-neutral-300 font-medium">How it works</p>
              <ul className="list-decimal list-inside space-y-1">
                <li>Click &quot;Open Roblox Login&quot; to launch the official page.</li>
                <li>Sign in inside the new window.</li>
                <li>Once Roblox finishes, we import the account automatically.</li>
              </ul>
            </div>

            {error && (
              <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleBrowserLogin}
              disabled={isLoading}
              className="pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              <span>{isLoading ? 'Waiting on Roblox...' : 'Open Roblox Login'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-4 border-t border-neutral-800">
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default AddAccountStep
