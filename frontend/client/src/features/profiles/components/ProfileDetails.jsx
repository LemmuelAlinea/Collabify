export function ProfileDetails({ profile }) {
  const rows = [
    ['Email', profile.email],
    ['Department', profile.department],
    ['Program', profile.program],
  ]

  if (profile.role === 'student') {
    rows.push(['Year level', profile.yearLevel ? `Year ${profile.yearLevel}` : null])
    rows.push(['Section', profile.section])
  }

  if (profile.role === 'professor') {
    rows.push(['Subject specialization', profile.subjectSpecialization])
  }

  return (
    <dl className="profile-details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || 'Not set'}</dd>
        </div>
      ))}
    </dl>
  )
}
