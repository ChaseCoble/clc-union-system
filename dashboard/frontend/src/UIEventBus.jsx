import { createContext, useContext, useRef } from 'react'

const UIEventBusContext = createContext(null)

export function UIEventBusProvider({ children }) {
  const subscribers = useRef({})

  const publish = (event, payload = {}) => {
    const handlers = subscribers.current[event] || []
    handlers.forEach(fn => fn(payload))
  }

  const subscribe = (event, fn) => {
    if (!subscribers.current[event]) {
      subscribers.current[event] = []
    }
    subscribers.current[event].push(fn)
    return () => {
      subscribers.current[event] =
        subscribers.current[event].filter(f => f !== fn)
    }
  }

  return (
    <UIEventBusContext.Provider value={{ publish, subscribe }}>
      {children}
    </UIEventBusContext.Provider>
  )
}

export function useUIEventBus() {
  const ctx = useContext(UIEventBusContext)
  if (!ctx) throw new Error('useUIEventBus must be used within UIEventBusProvider')
  return ctx
}

// Signal constants — all valid UI signals
export const UI_SIGNALS = {
  FOCUS_ENTERED:            'ui.focus.entered',
  FOCUS_EXITED:             'ui.focus.exited',
  PANEL_LOADED:             'ui.panel.loaded',
  ORCHESTRATOR_UNREACHABLE: 'ui.orchestrator.unreachable',
  TAB_CHANGED:              'ui.tab.changed',
  PANELS_REFRESHED:         'ui.panels.refreshed',
}
