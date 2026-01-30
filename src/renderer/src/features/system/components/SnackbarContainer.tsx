import React, { useEffect } from 'react'
import Snackbar from '@renderer/components/UI/feedback/Snackbar'
import {
  useSnackbarNotifications,
  useRemoveSnackbar,
  useShowNotification,
  SnackbarType
} from '@renderer/features/system/stores/useSnackbarStore'







const SnackbarContainer: React.FC = () => {
  const notifications = useSnackbarNotifications()
  const removeNotification = useRemoveSnackbar()
  const showNotification = useShowNotification()


  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'show-notification',
      (
        _event,
        { message, type, duration }: { message: string; type?: SnackbarType; duration?: number }
      ) => {
        showNotification(message, type, duration)
      }
    )

    return () => {
      removeListener()
    }
  }, [showNotification])

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Snackbar
            id={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={removeNotification}
          />
        </div>
      ))}
    </div>
  )
}

export default SnackbarContainer