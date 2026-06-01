export function ProfileAvatar({ avatarUrl, fullName }) {
  const initials = (fullName || 'Collabify User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="profile-avatar" aria-label={`${fullName} profile photo`}>
      {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials || 'CU'}</span>}
    </div>
  )
}
