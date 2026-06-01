export function FormField({ id, label, error, className = '', children }) {
  return (
    <label className={`ui-form-field ${className}`.trim()} htmlFor={id}>
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  )
}
