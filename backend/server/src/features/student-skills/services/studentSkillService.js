import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'

const SKILL_SELECT = 'skill_key, proficiency, created_at, updated_at'

function normalizeSkill(row) {
  return {
    skillKey: row.skill_key,
    proficiency: row.proficiency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getOwnSkillSet(userId) {
  const { data, error } = await supabaseAdminClient
    .from('student_skill_set')
    .select(SKILL_SELECT)
    .eq('user_id', userId)
    .order('skill_key', { ascending: true })

  if (error) {
    throw new HttpError(400, 'Unable to load skill set', error.message)
  }

  return data.map(normalizeSkill)
}

export async function replaceOwnSkillSet(userId, skills) {
  const { error: deleteError } = await supabaseAdminClient
    .from('student_skill_set')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    throw new HttpError(400, 'Unable to update skill set', deleteError.message)
  }

  if (skills.length > 0) {
    const rows = skills.map((skill) => ({
      user_id: userId,
      skill_key: skill.skillKey,
      proficiency: skill.proficiency,
    }))

    const { error: insertError } = await supabaseAdminClient
      .from('student_skill_set')
      .insert(rows)

    if (insertError) {
      throw new HttpError(400, 'Unable to update skill set', insertError.message)
    }
  }

  const { error: profileError } = await supabaseAdminClient
    .from('profiles')
    .update({ skills_onboarding_done: true })
    .eq('user_id', userId)

  if (profileError) {
    throw new HttpError(400, 'Unable to update onboarding status', profileError.message)
  }

  return getOwnSkillSet(userId)
}
