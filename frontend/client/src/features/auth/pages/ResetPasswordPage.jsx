import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthFormField } from '../components/AuthFormField'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'

export function ResetPasswordPage() {
  const { initPasswordRecovery, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let mounted = true

    initPasswordRecovery()
      .catch((authError) => {
        if (!mounted) return
        setError(authError.message ?? 'Invalid or expired reset link.')
      })
      .finally(() => {
        if (mounted) setIsInitializing(false)
      })

    return () => {
      mounted = false
    }
  }, [initPasswordRecovery])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (isInitializing) return
    setIsSubmitting(true)

    try {
      await resetPassword(password)
      navigate('/login', { replace: true })
    } catch (authError) {
      setError(authError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure update"
      title="Set new password"
      subtitle="Choose a new password for your Collabify account."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthFormField id="password" label="New password" name="password" type="password" minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <AuthFormField id="confirmPassword" label="Confirm password" name="confirmPassword" type="password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting || isInitializing}>
          {isInitializing ? 'Preparing...' : isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/login">Back to sign in</Link>
      </div>
    </AuthLayout>
  )
}
