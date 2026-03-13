import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@renderer/components/UI/buttons/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '@renderer/components/UI/dialogs/Dialog'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <AlertTriangle className="text-neutral-300" size={20} />
            </div>
            <DialogTitle className="pl-0">{title}</DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>

        <DialogBody>
          <p className="text-neutral-300 text-base leading-relaxed">{message}</p>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-auto py-3 text-neutral-300"
            >
              {cancelText}
            </Button>
            <Button
              variant={isDangerous ? 'destructive' : 'default'}
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 h-auto py-3"
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmModal
