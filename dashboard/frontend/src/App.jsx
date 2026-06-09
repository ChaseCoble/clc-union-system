import { useState, useEffect, useCallback } from 'react'
import { UIEventBusProvider, useUIEventBus, UI_SIGNALS } from './UIEventBus.jsx'
import AuthGuard from './AuthGuard.jsx'
import TabBar from './TabBar.jsx'
import LayoutManager from './LayoutManager.jsx'
import FocusMode from './FocusMode.jsx'
import FailureState from './FailureState.jsx'
import { getTabs, createTab, getPanels, getUIState, saveUIState } from './api.js'

function Dashboard({ user }) {
  const { publish, subscribe } = useUIEventBus()
  const [tabs, setTabs]                     = useState([])
  const [activeTabId, setActiveTabId]       = useState(null)
  const [panels, setPanels]                 = useState([])
  const [orchestratorUp, setOrchestratorUp] = useState(true)
  const [orchestratorLastSeen, setOrchestratorLastSeen] = useState(null)
  const [focusOpen, setFocusOpen]           = useState(false)
  const [ready, setReady]                   = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const panelData = await getPanels()
        setPanels(panelData.panels || [])
        setOrchestratorUp(panelData.orchestrator_reachable)
        if (panelData.orchestrator_reachable) {
          setOrchestratorLastSeen(new Date().toISOString())
        }
        let tabData = await getTabs(user.user_id)
        if (!tabData.length) {
          const defaultTab = await createTab(user.user_id, { name: 'MAIN', order: 0 })
          tabData = [defaultTab]
        }
        setTabs(tabData)
        const uiState = await getUIState(user.user_id)
        const savedTab = tabData.find(t => t.id === uiState.active_tab_id)
        setActiveTabId(savedTab ? savedTab.id : tabData[0].id)
      } catch {
        setOrchestratorUp(false)
      } finally {
        setReady(true)
      }
    }
    init()
  }, [user.user_id])

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const panelData = await getPanels()
        const reachable = panelData.orchestrator_reachable
        setOrchestratorUp(reachable)
        if (reachable) {
          setOrchestratorLastSeen(new Date().toISOString())
          setPanels(panelData.panels || [])
        } else {
          publish(UI_SIGNALS.ORCHESTRATOR_UNREACHABLE, {})
        }
      } catch {
        setOrchestratorUp(false)
        publish(UI_SIGNALS.ORCHESTRATOR_UNREACHABLE, {})
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const handleTabChange = useCallback(async (tabId) => {
    setActiveTabId(tabId)
    try {
      await saveUIState(user.user_id, { active_tab_id: tabId })
    } catch {
      // Non-fatal
    }
    publish(UI_SIGNALS.TAB_CHANGED, { tab_id: tabId })
  }, [user.user_id])

  const activeTab = tabs.find(t => t.id === activeTabId)

  if (!ready) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingText}>INITIALIZING</span>
      </div>
    )
  }

  return (
    <div style={styles.shell}>
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <span style={styles.brandMark}>▣</span>
          <span style={styles.brandName}>UNION</span>
        </div>
        <div style={styles.topBarCenter}>
          {!orchestratorUp && (
            <FailureState lastSeen={orchestratorLastSeen} />
          )}
        </div>
        <div style={styles.topBarRight}>
          <span style={styles.userChip}>{user.username}</span>
          <span style={{
            ...styles.statusIndicator,
            background: orchestratorUp ? 'var(--color-success)' : 'var(--color-destructive)'
          }} />
        </div>
      </div>

      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        userId={user.user_id}
        onTabChange={handleTabChange}
        onTabsChange={setTabs}
        onFocusOpen={() => setFocusOpen(true)}
      />

      {activeTab && (
        <LayoutManager
          key={activeTab.id}
          tab={activeTab}
          panels={panels}
          onLayoutChange={(newLayout) => {
            setTabs(prev => prev.map(t =>
              t.id === activeTab.id
                ? { ...t, layout: { panels: newLayout } }
                : t
            ))
          }}
        />
      )}

      {focusOpen && (
        <FocusMode onClose={() => setFocusOpen(false)} />
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)

  return (
    <UIEventBusProvider>
      <AuthGuard onUser={setUser}>
        {user && <Dashboard user={user} />}
      </AuthGuard>
    </UIEventBusProvider>
  )
}

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: 'var(--color-bg)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '36px',
    padding: '0 12px',
    background: 'var(--color-surface-1)',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandMark: {
    color: 'var(--color-primary)',
    fontSize: '14px',
  },
  brandName: {
    fontFamily: 'var(--font-base)',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '0.2em',
  },
  topBarCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userChip: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.1em',
  },
  statusIndicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'background var(--transition-slow)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--color-bg)',
  },
  loadingText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.2em',
  },
}
