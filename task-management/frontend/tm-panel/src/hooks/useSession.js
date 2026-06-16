import { useState, useEffect, useCallback, useRef } from 'react'

const toUTC = (dateStr) => {
  if (!dateStr) return null
  return dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'
}

export function useSession(api) {
  const [session, setSession]     = useState(null)
  const [breaking, setBreaking]   = useState(false)
  const [breakSecs, setBreakSecs] = useState(0)
  const [tick, setTick]           = useState(0)

  const breakTimerRef = useRef(null)
  const tickRef       = useRef(null)

  // Derived — always accurate from backend started_at, forced UTC
  const elapsed = (() => {
    if (!session?.started_at || session?.ended_at) return 0
    const raw = Math.floor((Date.now() - new Date(toUTC(session.started_at)).getTime()) / 1000)
    return Math.max(0, raw - breakSecs)
  })()

  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000)
  }, [])

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])

  const startBreakTimer = useCallback(() => {
    if (breakTimerRef.current) clearInterval(breakTimerRef.current)
    breakTimerRef.current = setInterval(() => setBreakSecs(b => b + 1), 1000)
  }, [])

  const stopBreakTimer = useCallback(() => {
    if (breakTimerRef.current) { clearInterval(breakTimerRef.current); breakTimerRef.current = null }
  }, [])

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (breakTimerRef.current) clearInterval(breakTimerRef.current)
  }, [])

  const load = useCallback(async () => {
    try {
      const s = await api.getSession()
      setSession(s)
      if (s?.started_at && !s?.ended_at) {
        startTick()
      } else {
        stopTick()
      }
    } catch {
      setSession(null)
      stopTick()
    }
  }, [api, startTick, stopTick])

  const start = useCallback(async () => {
    const s = await api.startSession()
    setSession(s)
    setBreaking(false)
    setBreakSecs(0)
    startTick()
    return s
  }, [api, startTick])

  const end = useCallback(async () => {
    stopTick()
    stopBreakTimer()
    const activeMin = Math.floor(elapsed / 60)
    const breakMin  = Math.floor(breakSecs / 60)
    const s = await api.endSession(activeMin, breakMin)
    setSession(s)
    setBreaking(false)
    setBreakSecs(0)
    return s
  }, [api, elapsed, breakSecs, stopTick, stopBreakTimer])

  const toggleBreak = useCallback(() => {
    if (!session || session.ended_at) return
    if (breaking) {
      stopBreakTimer()
      setBreaking(false)
    } else {
      startBreakTimer()
      setBreaking(true)
    }
  }, [session, breaking, startBreakTimer, stopBreakTimer])

  const incrementTasksCompleted = useCallback(() => {
    setSession(s => s ? { ...s, tasks_completed: (s.tasks_completed ?? 0) + 1 } : s)
  }, [])

  return { session, elapsed, breaking, breakSecs, load, start, end, toggleBreak, incrementTasksCompleted }
}
