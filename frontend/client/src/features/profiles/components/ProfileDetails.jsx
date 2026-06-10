import { Link } from 'react-router-dom'
import { BookOpen, Building2, GraduationCap, Mail, Sparkles, Users } from 'lucide-react'
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES } from '../../onboarding/constants/skills'

const ICONS = {
  Email: Mail,
  Department: Building2,
  Program: BookOpen,
  'Year level': GraduationCap,
  Section: Users,
  'Subject specialization': Sparkles,
}

export function ProfileDetails({ profile, skills }) {
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
    <>
      <dl className="profile-details">
        {rows.map(([label, value]) => {
          const Icon = ICONS[label]
          return (
            <div key={label}>
              <span className="profile-details-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <div>
                <dt>{label}</dt>
                <dd>{value || 'Not set'}</dd>
              </div>
            </div>
          )
        })}
      </dl>

      {skills ? (
        <div className="profile-skills-section">
          <div className="profile-skills-header">
            <h3>Skills</h3>
            <Link to="/student/onboarding" className="profile-skills-edit-link">
              {skills.length > 0 ? 'Edit skills' : 'Add skills'}
            </Link>
          </div>
          {skills.length > 0 ? (
            <ul className="profile-skills-list">
              {skills.map((skill) => {
                const category = SKILL_CATEGORIES.find((item) => item.key === skill.skillKey)
                const level = PROFICIENCY_LEVELS.find((item) => item.key === skill.proficiency)
                return (
                  <li key={skill.skillKey} className="ui-badge profile-skill-badge">
                    {category?.label ?? skill.skillKey}
                    <span className="profile-skill-level">{level?.label ?? skill.proficiency}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="profile-skills-empty">No skills added yet.</p>
          )}
        </div>
      ) : null}
    </>
  )
}
