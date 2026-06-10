import { z } from 'zod'

export const SKILL_KEYS = [
  'frontend',
  'backend',
  'ui_ux_design',
  'mobile_dev',
  'database',
  'qa_testing',
  'documentation_technical_writing',
  'project_management',
]

export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced']

const skillEntrySchema = z.object({
  skillKey: z.enum(SKILL_KEYS),
  proficiency: z.enum(PROFICIENCY_LEVELS),
})

export const replaceSkillSetSchema = z.object({
  skills: z
    .array(skillEntrySchema)
    .max(SKILL_KEYS.length)
    .refine(
      (skills) => new Set(skills.map((skill) => skill.skillKey)).size === skills.length,
      { message: 'Duplicate skill keys are not allowed' },
    ),
})
