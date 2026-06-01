import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { AuthFormField } from '../components/AuthFormField'
import { ROLE_HOME_PATHS } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { isAuthenticated, role, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated && role) {
    return <Navigate to={ROLE_HOME_PATHS[role]} replace />
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const data = await signIn(form)
      const nextRole = data.user?.user_metadata?.role
      const fallbackPath = nextRole ? ROLE_HOME_PATHS[nextRole] : '/'
      navigate(location.state?.from?.pathname ?? fallbackPath, { replace: true })
    } catch (authError) {
      setError(authError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Use your Collabify account to continue to your workspace."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthFormField
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={updateField}
        />
        <AuthFormField
          id="password"
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={updateField}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create account</Link>
      </div>
    </AuthLayout>
  )
}
