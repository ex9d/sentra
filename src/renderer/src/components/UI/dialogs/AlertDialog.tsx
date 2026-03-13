import React from 'react'
import { AlertCircle, CheckCircle, InfoIcon, AlertTriangle } from 'lucide-react'
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogClose } from './Dialog'
import { cn } from '../../../lib/utils'

export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  isDangerous?: boolean
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  isDangerous = false
}) => {
  const isConfirm = type === 'confirm'
  const icon =
    type === 'success' ? (
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
    ) : type === 'error' ? (
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
    ) : type === 'warning' ? (
      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
    ) : (
      <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
    )

  const bgColor =
    type === 'success'
      ? 'bg-green-500/10 border-green-500/20'
      : type === 'error'
        ? 'bg-red-500/10 border-red-500/20'
        : type === 'warning'
          ? 'bg-yellow-500/10 border-yellow-500/20'
          : 'bg-blue-500/10 border-blue-500/20'

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {icon}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>
        <DialogBody className="space-y-6">
          <div className={cn('flex items-start gap-3 p-3 rounded-lg border', bgColor)}>
            <p className="text-sm text-neutral-300">{message}</p>
          </div>
          <div className="flex gap-2 pt-2">
            {isConfirm && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                onConfirm?.()
                onClose()
              }}
              className={cn(
                'flex-1 px-4 py-2 text-sm rounded-lg font-medium transition-colors',
                isDangerous
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-[var(--accent-color)] text-black hover:opacity-90'
              )}
            >
              {confirmText || (isConfirm ? 'Confirm' : 'OK')}
            </button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default AlertDialog
