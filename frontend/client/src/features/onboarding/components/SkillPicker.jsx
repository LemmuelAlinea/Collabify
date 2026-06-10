import * as Icons from 'lucide-react'
import { Check, Sparkles } from 'lucide-react'
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES } from '../constants/skills'

export function SkillPicker({ selections, onToggleSkill, onChangeProficiency }) {
  return (
    <div className="skill-picker-grid">
      {SKILL_CATEGORIES.map((skill) => {
        const Icon = Icons[skill.icon] ?? Sparkles
        const selection = selections[skill.key]
        const isSelected = Boolean(selection)

        return (
          <div key={skill.key} className={`skill-card${isSelected ? ' is-selected' : ''}`}>
            <button
              type="button"
              className="skill-card-toggle"
              aria-pressed={isSelected}
              onClick={() => onToggleSkill(skill.key)}
            >
              <span className="skill-card-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <span className="skill-card-label">{skill.label}</span>
              {isSelected ? (
                <span className="skill-card-check" aria-hidden="true">
                  <Check size={16} />
                </span>
              ) : null}
            </button>

            {isSelected ? (
              <div
                className="skill-proficiency segmented-control"
                role="radiogroup"
                aria-label={`${skill.label} proficiency`}
              >
                {PROFICIENCY_LEVELS.map((level) => (
                  <label key={level.key}>
                    <input
                      type="radio"
                      name={`proficiency-${skill.key}`}
                      value={level.key}
                      checked={selection === level.key}
                      onChange={() => onChangeProficiency(skill.key, level.key)}
                    />
                    <span>{level.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
