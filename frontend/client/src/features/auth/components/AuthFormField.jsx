export function AuthFormField({ label, id, error, ...inputProps }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} aria-invalid={Boolean(error)} {...inputProps} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}
