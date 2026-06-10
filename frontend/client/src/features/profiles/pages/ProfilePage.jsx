import { useState } from 'react'
import { LogOut, Pencil } from 'lucide-react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { Button } from '../../../components/ui/button'
import { useAuth } from '../../auth/hooks/useAuth'
import { useStudentSkills } from '../../onboarding/hooks/useStudentSkills'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProfileDetails } from '../components/ProfileDetails'
import { ProfileForm } from '../components/ProfileForm'
import { useProfile } from '../hooks/useProfile'

export function ProfilePage() {
  const { signOut } = useAuth()
  const { error, isLoading, profile, saveProfile } = useProfile()
  const isStudent = profile?.role === 'student'
  const { skills } = useStudentSkills({ skipInitialLoad: !isStudent })
  const [isEditing, setIsEditing] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSave(payload) {
    await saveProfile(payload)
    setSuccess('Profile updated.')
    setIsEditing(false)
  }

  if (isLoading) return <StudentPageSkeleton variant="profile" />

  if (error || !profile) {
    return (
      <section className="content-section">
        <h2>Profile unavailable</h2>
        <p>{error || 'Unable to load your profile.'}</p>
      </section>
    )
  }

  return (
    <section className="module-page profile-v2-page">
      <div className="profile-hero">
        <div className="profile-hero-banner" aria-hidden="true" />
        <div className="profile-hero-main">
          <ProfileAvatar avatarUrl={profile.avatarUrl} fullName={profile.fullName} className="profile-avatar-lg" />
          <div className="profile-hero-info">
            <span className="ui-badge profile-role-badge">{profile.role}</span>
            <h2>{profile.fullName}</h2>
            <p className="profile-bio">{profile.bio || 'No bio added yet.'}</p>
          </div>
          {!isEditing ? (
            <Button type="button" onClick={() => setIsEditing(true)}>
              <Pencil size={16} aria-hidden="true" />
              Edit profile
            </Button>
          ) : null}
        </div>
      </div>

      {success && !isEditing ? <p className="form-success">{success}</p> : null}

      {isEditing ? (
        <ProfileForm
          profile={profile}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      ) : (
        <>
          <ProfileDetails profile={profile} skills={isStudent ? skills : null} />
          <div className="profile-footer">
            <button className="profile-logout-button" type="button" onClick={signOut}>
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          </div>
        </>
      )}
    </section>
  )
}
