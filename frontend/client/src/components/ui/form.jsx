import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../lib/utils/cn'

export function FieldGroup({ className, ...props }) {
  return <div className={cn('ui-field-group', className)} {...props} />
}

export function Field({ className, ...props }) {
  return <div className={cn('ui-field', className)} {...props} />
}

export const FieldLabel = ({ className, ...props }) => (
  <LabelPrimitive.Root className={cn('ui-field-label', className)} {...props} />
)

export function FieldDescription({ className, ...props }) {
  return <p className={cn('ui-field-description', className)} {...props} />
}

export function FieldError({ className, ...props }) {
  return <p className={cn('ui-field-error', className)} {...props} />
}

export const Input = ({ className, ...props }) => <input className={cn('ui-input', className)} {...props} />
export const Textarea = ({ className, ...props }) => <textarea className={cn('ui-textarea', className)} {...props} />
export const Select = ({ className, ...props }) => <select className={cn('ui-select', className)} {...props} />
