import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils/cn'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({ className, children, side = 'left', ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-sheet-overlay" />
      <DialogPrimitive.Content className={cn('ui-sheet-content', `ui-sheet-${side}`, className)} {...props}>
        {children}
        <DialogPrimitive.Close className="ui-sheet-close" aria-label="Close">
          <X aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const SheetTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn('ui-sheet-title', className)} {...props} />
)

export const SheetDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn('ui-sheet-description', className)} {...props} />
)
