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
  const [tabs, setTabs]                   = useState([])
  const [activeTabId, setActiveTabId]     = useState(null)
  const [panels, setPanels]               = useState([])
  const [orchestratorUp, setOrchestratorUp] = useState(true)
  const [orchestratorLastSeen, setOrchestratorLastSeen] = useState(null)
  const [focusOpen, setFocusOpen]         = useState(false)
  const [ready, setReady]                 = useState(false)

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        // Load panels
        const panelData = await getPanels()
        setPanels(panelData.panels || [])
        setOrchestratorUp(panelData.orchestrator_reachable)
        if (panelData.orchestrator_reachable) {
          setOrchestratorLastSeen(new Date().toISOString())
        }

        // Load tabs
        let tabData = await getTabs(user.user_id)
        if (!tabData.length) {
          // First run — create default tab
          const defaultTab = await createTab(user.user_id, { name: 'MAIN', order: 0 })
          tabData = [defaultTab]
        }
        setTabs(tabData)

        // Restore active tab from UI state
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

  // Periodic orchestrator reachability check
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
      {/* Top bar */}
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
            background: orchestratorUp ? 'var(--status-ok)' : 'var(--status-error)'
          }} />
        </div>
      </div>

      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        userId={user.user_id}
        onTabChange={handleTabChange}
        onTabsChange={setTabs}
        onFocusOpen={() => setFocusOpen(true)}
      />

      {/* Main panel grid */}
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

      {/* Focus mode modal */}
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
    background: 'var(--bg-void)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '36px',
    padding: '0 12px',
    background: 'var(--bg-base)',
    borderBottom: '1px solid var(--border-dim)',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandMark: {
    color: 'var(--accent)',
    fontSize: '14px',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
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
    color: 'var(--text-dim)',
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
    background: 'var(--bg-void)',
  },
  loadingText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    letterSpacing: '0.2em',
  },
}
