import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthFormField } from '../components/AuthFormField'
import { AuthLayout } from '../components/AuthLayout'
import { USER_ROLES } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'

const initialForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: USER_ROLES.STUDENT,
  studentNumber: '',
  employeeNumber: '',
  yearLevel: '',
  section: '',
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      await signUp(form)
      setMessage('Registration received. Check your email to confirm your account.')
      setForm(initialForm)
    } catch (authError) {
      setError(authError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Join Collabify"
      title="Create account"
      subtitle="Choose the account type assigned by your BSIT program."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="segmented-control" role="radiogroup" aria-label="Account type">
          <label>
            <input
              type="radio"
              name="role"
              value={USER_ROLES.STUDENT}
              checked={form.role === USER_ROLES.STUDENT}
              onChange={updateField}
            />
            <span>Student</span>
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value={USER_ROLES.PROFESSOR}
              checked={form.role === USER_ROLES.PROFESSOR}
              onChange={updateField}
            />
            <span>Professor</span>
          </label>
        </div>

        <div className="form-grid">
          <AuthFormField id="firstName" label="First name" name="firstName" required value={form.firstName} onChange={updateField} />
          <AuthFormField id="lastName" label="Last name" name="lastName" required value={form.lastName} onChange={updateField} />
        </div>
        <AuthFormField id="email" label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={updateField} />
        <AuthFormField id="password" label="Password" name="password" type="password" autoComplete="new-password" minLength="8" required value={form.password} onChange={updateField} />

        {form.role === USER_ROLES.STUDENT ? (
          <div className="form-grid">
            <AuthFormField id="studentNumber" label="Student number" name="studentNumber" value={form.studentNumber} onChange={updateField} />
            <AuthFormField id="yearLevel" label="Year level" name="yearLevel" type="number" min="1" max="5" value={form.yearLevel} onChange={updateField} />
            <AuthFormField id="section" label="Section" name="section" value={form.section} onChange={updateField} />
          </div>
        ) : (
          <AuthFormField id="employeeNumber" label="Employee number" name="employeeNumber" value={form.employeeNumber} onChange={updateField} />
        )}

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/login">Already have an account?</Link>
      </div>
    </AuthLayout>
  )
}
