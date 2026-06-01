import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../../lib/utils/cn'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group

export function DropdownMenuContent({ className, sideOffset = 8, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content className={cn('ui-dropdown-content', className)} sideOffset={sideOffset} {...props} />
    </DropdownMenuPrimitive.Portal>
  )
}

export const DropdownMenuItem = ({ className, ...props }) => (
  <DropdownMenuPrimitive.Item className={cn('ui-dropdown-item', className)} {...props} />
)

export const DropdownMenuSeparator = ({ className, ...props }) => (
  <DropdownMenuPrimitive.Separator className={cn('ui-dropdown-separator', className)} {...props} />
)
