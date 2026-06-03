import { useCallback, useEffect, useState } from 'react'
import {
  addGroupMember,
  createGroup,
  getEligibleGroupMembers,
  getGroups,
  joinGroup,
  updateGroup,
  updateGroupMember,
} from '../services/groupService'

export function useGroups(projectId) {
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setGroups(await getGroups(projectId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const addGroup = useCallback(async (payload) => {
    const group = await createGroup(payload)
    setGroups((current) => [group, ...current])
    return group
  }, [])

  const join = useCallback(async (groupId) => {
    const group = await joinGroup(groupId)
    setGroups((current) => {
      const exists = current.some((item) => item.id === group.id)
      return exists ? current.map((item) => item.id === group.id ? group : item) : [group, ...current]
    })
    return group
  }, [])

  const saveGroup = useCallback(async (groupId, payload) => {
    const group = await updateGroup(groupId, payload)
    setGroups((current) => current.map((item) => item.id === group.id ? group : item))
    return group
  }, [])

  const saveMember = useCallback(async (groupId, userId, payload) => {
    const group = await updateGroupMember(groupId, userId, payload)
    setGroups((current) => current.map((item) => item.id === group.id ? group : item))
    return group
  }, [])

  const loadEligibleMembers = useCallback((groupId) => getEligibleGroupMembers(groupId), [])

  const addMember = useCallback(async (groupId, userId) => {
    const group = await addGroupMember(groupId, userId)
    setGroups((current) => current.map((item) => item.id === group.id ? group : item))
    return group
  }, [])

  return {
    addMember,
    addGroup,
    error,
    groups,
    isLoading,
    join,
    loadGroups,
    loadEligibleMembers,
    saveGroup,
    saveMember,
  }
}
