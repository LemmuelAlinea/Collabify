import { useCallback, useEffect, useState } from 'react'
import { getOwnSkillSet, saveOwnSkillSet } from '../services/studentSkillService'
import { useAuth } from '../../auth/hooks/useAuth'

export function useStudentSkills({ skipInitialLoad = false } = {}) {
  const { refreshAuth } = useAuth()
  const [skills, setSkills] = useState([])
  const [isLoading, setIsLoading] = useState(!skipInitialLoad)
  const [error, setError] = useState('')

  const loadSkills = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const nextSkills = await getOwnSkillSet()
      setSkills(nextSkills)
      return nextSkills
    } catch (skillsError) {
      setError(skillsError.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!skipInitialLoad) loadSkills()
  }, [loadSkills, skipInitialLoad])

  const saveSkills = useCallback(async (selections) => {
    setError('')
    const nextSkills = await saveOwnSkillSet(selections)
    setSkills(nextSkills)
    await refreshAuth()
    return nextSkills
  }, [refreshAuth])

  return {
    error,
    isLoading,
    loadSkills,
    saveSkills,
    skills,
  }
}
