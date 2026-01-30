import React, { createContext, useContext, useState, useCallback } from 'react'
import Snackbar, { SnackbarType, SnackbarProps } from '../components/UI/feedback/Snackbar'

interface NotificationContextType {
  showNotification: (message: string, type?: SnackbarType, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Omit<SnackbarProps, 'onClose'>[]>([])

  const showNotification = useCallback(
    (message: string, type: SnackbarType = 'info', duration = 5000) => {
      const id = Math.random().toString(36).substring(7)
      setNotifications((prev) => [...prev, { id, message, type, duration }])
    },
    []
  )

  React.useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'show-notification',
      (_event, { message, type, duration }) => {
        showNotification(message, type, duration)
      }
    )

    return () => {
      removeListener()
    }
  }, [showNotification])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Snackbar {...notification} onClose={removeNotification} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
