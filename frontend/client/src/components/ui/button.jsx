import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils/cn'

const buttonVariants = cva('ui-btn', {
  variants: {
    variant: {
      default: 'ui-btn-default',
      secondary: 'ui-btn-secondary',
      ghost: 'ui-btn-ghost',
      outline: 'ui-btn-outline',
      destructive: 'ui-btn-destructive',
      success: 'ui-btn-success',
    },
    size: {
      default: 'ui-btn-md',
      sm: 'ui-btn-sm',
      lg: 'ui-btn-lg',
      icon: 'ui-btn-icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export function Button({ asChild = false, className, variant, size, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
