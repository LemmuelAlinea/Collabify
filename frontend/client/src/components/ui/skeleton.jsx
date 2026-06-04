import { cn } from '../../lib/utils/cn'

export function Skeleton({ className, ...props }) {
  return <div className={cn('ui-skeleton', className)} {...props} />
}
