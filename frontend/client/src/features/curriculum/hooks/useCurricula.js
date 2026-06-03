import { useCallback, useEffect, useState } from 'react'
import {
  archiveCurriculum,
  createCurriculum,
  getCurricula,
  getCurriculum,
  getCurriculumDownloadUrl,
  updateCurriculum,
} from '../services/curriculumService'

export function useCurricula({ autoLoad = true } = {}) {
  const [curricula, setCurricula] = useState([])
  const [isLoading, setIsLoading] = useState(autoLoad)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setCurricula(await getCurricula())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) load()
  }, [autoLoad, load])

  const saveNewCurriculum = useCallback(async (payload) => {
    const curriculum = await createCurriculum(payload)
    setCurricula((current) => [curriculum, ...current])
    return curriculum
  }, [])

  const saveCurriculum = useCallback(async (id, payload) => {
    const curriculum = await updateCurriculum(id, payload)
    setCurricula((current) => current.map((item) => item.id === id ? curriculum : item))
    return curriculum
  }, [])

  const archive = useCallback(async (id) => {
    const curriculum = await archiveCurriculum(id)
    setCurricula((current) => current.map((item) => item.id === id ? curriculum : item))
    return curriculum
  }, [])

  const openDownload = useCallback(async (id) => {
    const url = await getCurriculumDownloadUrl(id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  return {
    archive,
    curricula,
    error,
    getCurriculum,
    isLoading,
    load,
    openDownload,
    saveCurriculum,
    saveNewCurriculum,
  }
}
