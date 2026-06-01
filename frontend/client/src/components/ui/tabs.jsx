import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = ({ className, ...props }) => (
  <TabsPrimitive.List className={cn('ui-tabs-list', className)} {...props} />
)

export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger className={cn('ui-tabs-trigger', className)} {...props} />
)

export const TabsContent = ({ className, ...props }) => (
  <TabsPrimitive.Content className={cn('ui-tabs-content', className)} {...props} />
)
