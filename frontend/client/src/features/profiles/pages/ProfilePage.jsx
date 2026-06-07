import { useState } from 'react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { useAuth } from '../../auth/hooks/useAuth'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProfileDetails } from '../components/ProfileDetails'
import { ProfileForm } from '../components/ProfileForm'
import { useProfile } from '../hooks/useProfile'

export function ProfilePage() {
  const { signOut } = useAuth()
  const { error, isLoading, profile, saveProfile } = useProfile()
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
    <section className="profile-page">
      <div className="profile-header">
        <ProfileAvatar avatarUrl={profile.avatarUrl} fullName={profile.fullName} />
        <div>
          <p className="eyebrow">{profile.role}</p>
          <h2>{profile.fullName}</h2>
          <p>{profile.bio || 'No bio added yet.'}</p>
        </div>
        {!isEditing ? (
          <button className="primary-button" type="button" onClick={() => setIsEditing(true)}>
            Edit profile
          </button>
        ) : null}
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
          <ProfileDetails profile={profile} />
          <button className="profile-logout-button" type="button" onClick={signOut}>
            Logout
          </button>
        </>
      )}
    </section>
  )
}
