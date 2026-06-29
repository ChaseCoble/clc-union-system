import { useState, useEffect, useCallback } from 'react'
import { api as makeApi } from './api'
import { useQueue } from './hooks/useQueue'
import { useSession } from './hooks/useSession'
import { useHyperparams } from './hooks/useHyperparams'
import TaskCard from './components/TaskCard'
import AddTaskForm from './components/AddTaskForm'
import HealthSignals from './components/HealthSignals'
import HyperparamPanel from './components/HyperparamPanel'
import GatedTaskTray from './components/GatedTaskTray'

const MODES = [
  { value: 'DEEP_WORK',  label: 'Deep work' },
  { value: 'LIGHT_WORK', label: 'Light work' },
  { value: 'PHONE_WORK', label: 'Phone work' },
]

export default function App({ apiBase }) {
  const api = makeApi(apiBase)
  const queue = useQueue(api)
  const session = useSession(api)
  const hp = useHyperparams(api)
  const [showAdd, setShowAdd] = useState(false)
  const [mode, setMode] = useState('DEEP_WORK')
  const [rightOpen, setRightOpen] = useState(false)

  useEffect(() => {
    queue.load(mode)
    session.load()
    hp.load()
  }, [])

  const handleModeChange = useCallback(async (e) => {
    const newMode = e.target.value
    setMode(newMode)
    await queue.load(newMode)
  }, [queue])

  const handleComplete = useCallback(async (id, duration) => {
    await queue.completeTask(id, duration, mode)
    session.incrementTasksCompleted()
  }, [queue, session, mode])

  const handleBlock = useCallback(async (id, payload) => {
    await queue.blockTask(id, payload, mode)
  }, [queue, mode])

  const handleMount = useCallback(async (id) => {
    await queue.mountTask(id, mode)
  }, [queue, mode])

  const handleUnmount = useCallback(async (id) => {
    await queue.unmountTask(id, mode)
  }, [queue, mode])

  const handleAddTask = useCallback(async (payload) => {
    await api.createTask(payload)
    setShowAdd(false)
    await queue.recompute(mode)
  }, [api, queue, mode])

  const handleRecompute = useCallback(async () => {
    await queue.recompute(mode)
  }, [queue, mode])

  const isSessionActive = session.session && !session.session.ended_at
  const topTask = queue.queue.find(t => !t.mounted)
  const mountedTasks = queue.queue.filter(t => t.mounted)

  return (
    <div style={s.shell}>
      {/* LEFT COLUMN */}
      <div style={s.left}>
        <div style={s.header}>
          <span style={s.panelTitle}>Task Manager</span>
          <div style={s.headerActions}>
            <select style={s.modeSelect} value={mode} onChange={handleModeChange}>
              {MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {isSessionActive ? (
              <>
                <button style={s.btnSession} onClick={session.end}>End session</button>
                <button
                  style={{ ...s.btn, ...(session.breaking ? s.btnBreakActive : {}) }}
                  onClick={session.toggleBreak}
                >
                  {session.breaking ? 'Resume' : 'Break'}
                </button>
              </>
            ) : (
              <button style={{ ...s.btnSession, ...s.btnSessionInactive }} onClick={session.start}>
                Start session
              </button>
            )}
            <button style={s.btnPrimary} onClick={() => setShowAdd(v => !v)}>Add task</button>
          </div>
        </div>

        {showAdd && (
          <AddTaskForm onSubmit={handleAddTask} onCancel={() => setShowAdd(false)} />
        )}

        {topTask ? (
          <TaskCard
            key={topTask.id}
            task={topTask}
            isTop
            apiBase={apiBase}
            onComplete={handleComplete}
            onBlock={handleBlock}
            onMount={handleMount}
            onUnmount={handleUnmount}
            onRefresh={() => queue.load(mode)}
          />
        ) : !showAdd && (
          <div style={s.empty}>
            No tasks queued for {MODES.find(m => m.value === mode)?.label.toLowerCase()}.<br />
            <button style={{ ...s.btn, marginTop: '8px' }} onClick={handleRecompute}>
              Recompute queue
            </button>
          </div>
        )}

        {mountedTasks.length > 0 && (
          <>
            <div style={s.sectionLabel}>Mounted</div>
            {mountedTasks.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                isTop={false}
                apiBase={apiBase}
                onComplete={handleComplete}
                onBlock={handleBlock}
                onMount={handleMount}
                onUnmount={handleUnmount}
                onRefresh={() => queue.load(mode)}
              />
            ))}
          </>
        )}

        <GatedTaskTray
          api={api}
          mode={mode}
          onSet={(task) => {
            queue.appendTask(task)
          }}
          onUnblock={() => queue.load(mode)}
        />

        <div style={s.footer}>
          <span style={s.footerCount}>{queue.queue.length} tasks queued</span>
          <button style={s.btn} onClick={handleRecompute} disabled={queue.loading}>
            {queue.loading ? '...' : 'Recompute'}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ ...s.right, width: rightOpen ? '220px' : '28px' }}>
        {rightOpen ? (
          <>
            <div style={s.rightToggle} onClick={() => setRightOpen(false)}>
              <span style={s.toggleScore}>
                {session.session?.performance_score != null
                  ? Math.round(session.session.performance_score)
                  : '—'}
              </span>
              <span style={s.toggleArrow}>▶</span>
            </div>
            <HealthSignals
              session={session.session}
              elapsed={session.elapsed}
              breaking={session.breaking}
              breakSecs={session.breakSecs}
              queue={queue.queue}
              hyperparams={hp.params}
            />
            <HyperparamPanel
              params={hp.params}
              saving={hp.saving}
              saved={hp.saved}
              onSave={hp.saveAll}
            />
          </>
        ) : (
          <div style={s.rightCollapsed} onClick={() => setRightOpen(true)}>
            <span style={s.collapsedScore}>
              {session.session?.performance_score != null
                ? Math.round(session.session.performance_score)
                : '—'}
            </span>
            <span style={s.collapsedLabel}>Q</span>
            <span style={s.toggleArrow}>◀</span>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  shell: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    background: 'var(--color-bg)',
  },
  left: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    borderRight: '1px solid var(--color-border)',
  },
  right: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    borderLeft: '1px solid var(--color-border)',
    transition: 'width 150ms ease',
    overflow: 'hidden',
  },
  rightToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-1)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  toggleScore: {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-success)',
    lineHeight: 1,
  },
  toggleArrow: {
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
  },
  rightCollapsed: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 'var(--spacing-sm)',
    gap: 'var(--spacing-xs)',
    cursor: 'pointer',
    height: '100%',
    background: 'var(--color-surface-1)',
  },
  collapsedScore: {
    fontFamily: 'var(--font-base)',
    fontSize: '14px',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-success)',
    lineHeight: 1,
  },
  collapsedLabel: {
    fontSize: '9px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.1em',
    writingMode: 'vertical-rl',
    textTransform: 'uppercase',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-1)',
    flexShrink: 0,
    gap: 'var(--spacing-sm)',
  },
  panelTitle: {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  headerActions: { display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' },
  modeSelect: {
    padding: '3px 8px',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    outline: 'none',
  },
  btn: {
    padding: '3px 10px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
  btnBreakActive: {
    borderColor: 'var(--color-warning)',
    color: 'var(--color-warning)',
  },
  btnPrimary: {
    padding: '3px 10px',
    background: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
  btnSession: {
    padding: '3px 10px',
    background: 'var(--color-success)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
  btnSessionInactive: {
    background: 'transparent',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-muted)',
  },
  sectionLabel: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)',
    flexShrink: 0,
  },
  empty: {
    padding: 'var(--spacing-lg) var(--spacing-md)',
    textAlign: 'center',
    color: 'var(--color-text-disabled)',
    fontSize: 'var(--font-size-xs)',
  },
  footer: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    gap: 'var(--spacing-xs)',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 'auto',
  },
  footerCount: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-disabled)',
    flex: 1,
  },
}
