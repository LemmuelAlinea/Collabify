import { cn } from '../../lib/utils/cn'

export function Badge({ className, ...props }) {
  return <span className={cn('ui-badge', className)} {...props} />
}
