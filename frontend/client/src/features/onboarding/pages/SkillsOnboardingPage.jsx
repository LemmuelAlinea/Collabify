import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, Sparkles } from 'lucide-react'
import { ThemeToggle } from '../../../app/providers/ThemeProvider'
import { Button } from '../../../components/ui/button'
import { ROLE_HOME_PATHS } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { SkillPicker } from '../components/SkillPicker'
import { useStudentSkills } from '../hooks/useStudentSkills'

export function SkillsOnboardingPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isEditMode = Boolean(profile?.skillsOnboardingDone)
  const { error, loadSkills, saveSkills } = useStudentSkills({ skipInitialLoad: true })
  const [selections, setSelections] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isEditMode) return

    let isMounted = true

    loadSkills().then((existingSkills) => {
      if (!isMounted) return
      const nextSelections = {}
      existingSkills.forEach((skill) => {
        nextSelections[skill.skillKey] = skill.proficiency
      })
      setSelections(nextSelections)
    })

    return () => {
      isMounted = false
    }
  }, [isEditMode, loadSkills])

  function toggleSkill(skillKey) {
    setSelections((current) => {
      const next = { ...current }
      if (next[skillKey]) {
        delete next[skillKey]
      } else {
        next[skillKey] = 'beginner'
      }
      return next
    })
  }

  function changeProficiency(skillKey, proficiency) {
    setSelections((current) => ({ ...current, [skillKey]: proficiency }))
  }

  async function submit(skillsPayload) {
    setIsSubmitting(true)
    try {
      await saveSkills(skillsPayload)
      navigate(isEditMode ? '/student/profile' : ROLE_HOME_PATHS.student, { replace: true })
    } catch {
      // error surfaced via the hook's `error` state
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const skillsPayload = Object.entries(selections).map(([skillKey, proficiency]) => ({
      skillKey,
      proficiency,
    }))
    submit(skillsPayload)
  }

  function handleSkip() {
    submit([])
  }

  const selectedCount = Object.keys(selections).length

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel" aria-labelledby="onboarding-title">
        <div className="onboarding-topbar">
          <div className="brand-block">
            <img className="brand-logo" src="/brand/collabify-logo.png" alt="Collabify" />
            <div>
              <p className="eyebrow">
                <Sparkles size={14} aria-hidden="true" /> {isEditMode ? 'Your skill set' : 'One last step'}
              </p>
              <h1 id="onboarding-title">
                {isEditMode ? 'Update your skills' : "Tell us what you're good at"}
              </h1>
            </div>
          </div>
          <div className="auth-topbar-actions">
            <Link to="/" className="auth-home-button" aria-label="Go to home page" title="Home">
              <Home size={16} aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <p className="onboarding-subtitle">
          Select the BSIT-related skills you&apos;re comfortable with and rate your proficiency.
          This helps your professors and groupmates know your strengths.
          {isEditMode ? '' : ' You can skip this and update it anytime from your Profile.'}
        </p>

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <SkillPicker
            selections={selections}
            onToggleSkill={toggleSkill}
            onChangeProficiency={changeProficiency}
          />

          {error ? <p className="form-error">{error}</p> : null}

          <div className="onboarding-actions">
            {isEditMode ? (
              <Link to="/student/profile" className="secondary-button">
                Cancel
              </Link>
            ) : (
              <button type="button" className="secondary-button" onClick={handleSkip} disabled={isSubmitting}>
                Skip for now
              </button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {selectedCount > 0 ? `Save ${selectedCount} skill${selectedCount > 1 ? 's' : ''}` : 'Continue'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
