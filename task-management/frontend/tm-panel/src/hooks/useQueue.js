import { useState, useCallback } from 'react'

export function useQueue(api) {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (mode = 'DEEP_WORK') => {
    try {
      const data = await api.getQueue(mode)
      setQueue([...data])
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [api])

  const recompute = useCallback(async (mode = 'DEEP_WORK') => {
    setLoading(true)
    try {
      const data = await api.recompute(mode)
      setQueue([...data])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [api])

  const completeTask = useCallback(async (id, duration, mode = 'DEEP_WORK') => {
    await api.completeTask(id, duration)
    await load(mode)
  }, [api, load])

  const blockTask = useCallback(async (id, payload, mode = 'DEEP_WORK') => {
    await api.blockTask(id, payload)
    await load(mode)
  }, [api, load])

  const mountTask = useCallback(async (id, mode = 'DEEP_WORK') => {
    await api.mountTask(id)
    await load(mode)
  }, [api, load])

  const unmountTask = useCallback(async (id, mode = 'DEEP_WORK') => {
    await api.unmountTask(id)
    await load(mode)
  }, [api, load])

  // Append a task directly — used when mounting gated tasks that
  // won't appear in the pipeline output
  const appendTask = useCallback((task) => {
    setQueue(prev => prev.find(t => t.id === task.id) ? prev : [...prev, task])
  }, [])

  return { queue, loading, error, load, recompute, completeTask, blockTask, mountTask, unmountTask, appendTask }
}
