import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function AuthFormField({ label, id, error, type, ...inputProps }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <span className={isPassword ? 'password-field-control' : undefined}>
        <input id={id} type={isPassword && isPasswordVisible ? 'text' : type} aria-invalid={Boolean(error)} {...inputProps} />
        {isPassword ? (
          <button
            type="button"
            className="password-visibility-button"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            onClick={() => setIsPasswordVisible((current) => !current)}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </span>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}
