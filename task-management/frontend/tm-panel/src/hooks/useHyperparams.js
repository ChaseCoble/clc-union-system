import { useState, useCallback } from 'react'

export function useHyperparams(api) {
  const [params, setParams] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getHyperparams()
      const map = {}
      for (const hp of data) map[hp.key] = hp.value
      setParams(map)
    } catch {}
  }, [api])

  const saveAll = useCallback(async (edits) => {
    if (saving) return
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(edits).map(([key, value]) => api.setHyperparam(key, value))
      )
      setParams({ ...edits })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }, [api, saving])

  return { params, saving, saved, load, saveAll }
}
