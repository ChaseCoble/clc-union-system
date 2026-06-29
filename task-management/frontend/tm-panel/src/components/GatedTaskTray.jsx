import { useState, useCallback } from 'react'

const VIEWS = [
  { key: 'urgent_forbidden', label: 'Urgent dropped',  type: 'forbidden' },
  { key: 'all_forbidden',    label: 'All dropped',     type: 'forbidden' },
  { key: 'urgent_blocked',   label: 'Urgent blocked',  type: 'blocked'   },
  { key: 'all_blocked',      label: 'All blocked',     type: 'blocked'   },
]

export default function GatedTaskTray({ api, mode, onSet, onUnblock }) {
  const [open, setOpen]       = useState(false)
  const [view, setView]       = useState('urgent_forbidden')
  const [tasks, setTasks]     = useState([])
  const [counts, setCounts]   = useState({ total: 0, urgent: 0, blocked_total: 0, blocked_urgent: 0 })
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [acting, setActing]   = useState(null)

  const loadCounts = useCallback(async () => {
    try {
      const [f, b] = await Promise.all([
        api.getForbiddenCount(mode),
        api.getBlockedCount(),
      ])
      setCounts({
        total: f.total,
        urgent: f.urgent,
        blocked_total: b.total,
        blocked_urgent: b.urgent,
      })
    } catch {}
  }, [api, mode])

  const loadTasks = useCallback(async (v = view, p = 1) => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (v === 'urgent_forbidden') data = await api.getForbiddenUrgent(mode, p)
      else if (v === 'all_forbidden')  data = await api.getForbidden(mode, p)
      else if (v === 'urgent_blocked') data = await api.getBlockedUrgent(p)
      else                             data = await api.getBlocked(p)
      setTasks(data)
      setPage(p)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [api, mode, view])

  const handleOpen = () => {
    if (!open) {
      loadCounts()
      loadTasks(view, 1)
    }
    setOpen(o => !o)
  }

  const handleViewChange = (v) => {
    setView(v)
    setPage(1)
    loadTasks(v, 1)
  }

  const handleSet = async (task) => {
    if (acting) return
    setActing(task.id)
    try {
      if (task.status === 'BLOCKED') {
        await api.unblockTask(task.id)
      }
      const mounted = await api.mountTask(task.id)
      await Promise.all([loadTasks(view, page), loadCounts()])
      // Fetch fresh task and pass to parent to append to queue
      const fresh = await api.getTask(task.id)
      if (onSet) onSet(fresh)
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(null)
    }
  }

  const handleUnblock = async (task) => {
    if (acting) return
    setActing(task.id)
    try {
      await api.unblockTask(task.id)
      await Promise.all([loadTasks(view, page), loadCounts()])
      if (onUnblock) onUnblock()
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(null)
    }
  }

  const currentView = VIEWS.find(v => v.key === view)
  const isBlocked = currentView?.type === 'blocked'

  const urgentTotal = counts.urgent + counts.blocked_urgent
  const allTotal = counts.total + counts.blocked_total

  return (
    <div style={s.tray}>
      <div style={s.bar} onClick={handleOpen}>
        <span style={s.barLabel}>Gated tasks</span>
        <div style={s.barRight}>
          {urgentTotal > 0 && (
            <span style={s.badgeUrgent}>{urgentTotal} urgent</span>
          )}
          {allTotal > 0 && (
            <span style={s.badge}>{allTotal} total</span>
          )}
          <span style={s.barArrow}>{open ? '▼' : '▲'}</span>
        </div>
      </div>

      {open && (
        <div style={s.body}>
          <div style={s.tabs}>
            {VIEWS.map(v => (
              <button
                key={v.key}
                style={{ ...s.tab, ...(view === v.key ? s.tabActive : {}) }}
                onClick={() => handleViewChange(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {error && <div style={s.errorRow}>{error}</div>}

          {loading && <div style={s.state}>Loading…</div>}
          {!loading && tasks.length === 0 && <div style={s.state}>None</div>}
          {!loading && tasks.map(t => (
            <div key={t.id} style={s.row}>
              <div style={s.rowLeft}>
                <span style={s.rowTitle}>{t.title}</span>
                <div style={s.rowMeta}>
                  <span style={isBlocked ? s.tagBlocked : s.tagDropped}>
                    {isBlocked ? 'blocked' : 'dropped'}
                  </span>
                  {t.work_type && (
                    <span style={s.tag}>{t.work_type.replace(/_/g, '-').toLowerCase()}</span>
                  )}
                  {t.difficulty_label && (
                    <span style={s.tagDifficulty}>{t.difficulty_label}</span>
                  )}
                </div>
                <span style={s.reason}>
                  {isBlocked
                    ? (t.block_type ? `Block: ${t.block_type}` : 'Blocked')
                    : (t.drop_reason || 'Dropped by rule pipeline')
                  }
                </span>
              </div>
              <div style={s.rowActions}>
                <button
                  style={{ ...s.btnSet, ...(acting === t.id ? s.btnDisabled : {}) }}
                  onClick={() => handleSet(t)}
                  disabled={!!acting}
                >
                  {acting === t.id ? '…' : 'Set'}
                </button>
                {isBlocked && (
                  <button
                    style={{ ...s.btnUnblock, ...(acting === t.id ? s.btnDisabled : {}) }}
                    onClick={() => handleUnblock(t)}
                    disabled={!!acting}
                  >
                    Unblock
                  </button>
                )}
              </div>
            </div>
          ))}

          {!loading && tasks.length > 0 && (
            <div style={s.pagination}>
              <button
                style={{ ...s.pageBtn, ...(page === 1 ? s.btnDisabled : {}) }}
                onClick={() => loadTasks(view, page - 1)}
                disabled={page === 1}
              >←</button>
              <span style={s.pageNum}>p{page}</span>
              <button
                style={{ ...s.pageBtn, ...(tasks.length < 10 ? s.btnDisabled : {}) }}
                onClick={() => loadTasks(view, page + 1)}
                disabled={tasks.length < 10}
              >→</button>
              <button
                style={{ ...s.pageBtn, marginLeft: 'auto' }}
                onClick={() => { loadTasks(view, page); loadCounts() }}
              >↻</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  tray: { flexShrink: 0, borderTop: '1px solid var(--color-border)' },
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    background: 'var(--color-surface-2)', cursor: 'pointer', userSelect: 'none',
  },
  barLabel: {
    fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)',
    textTransform: 'uppercase', letterSpacing: '0.1em',
  },
  barRight: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' },
  badge: {
    fontSize: '10px', color: 'var(--color-text-disabled)',
    padding: '1px 6px', border: '1px solid var(--color-border)',
  },
  badgeUrgent: {
    fontSize: '10px', color: 'var(--color-warning)',
    padding: '1px 6px', border: '1px solid var(--color-warning)',
  },
  barArrow: { fontSize: '9px', color: 'var(--color-text-disabled)' },
  body: {
    borderTop: '1px solid var(--color-border)', maxHeight: '260px',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  },
  tabs: { display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  tab: {
    flex: 1, padding: '4px 4px', background: 'transparent', border: 'none',
    borderRight: '1px solid var(--color-border)', color: 'var(--color-text-disabled)',
    fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer',
    letterSpacing: '0.03em', whiteSpace: 'nowrap',
  },
  tabActive: { color: 'var(--color-primary)', background: 'var(--color-surface-1)' },
  state: {
    padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-disabled)', textAlign: 'center',
  },
  errorRow: {
    padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--font-size-xs)',
    color: 'var(--color-destructive)', borderBottom: '1px solid var(--color-border)',
  },
  row: {
    display: 'flex', alignItems: 'flex-start',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)', gap: 'var(--spacing-xs)',
  },
  rowLeft: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px',
  },
  rowTitle: {
    fontSize: 'var(--font-size-xs)', color: 'var(--color-text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontWeight: 'var(--font-weight-medium)',
  },
  rowMeta: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  reason: {
    fontSize: '10px', color: 'var(--color-text-disabled)',
    fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tag: {
    display: 'inline-block', padding: '0px 5px',
    border: '1px solid var(--color-border)', color: 'var(--color-text-disabled)', fontSize: '10px',
  },
  tagDifficulty: {
    display: 'inline-block', padding: '0px 5px',
    border: '1px solid var(--color-border)', color: 'var(--color-text-disabled)',
    fontSize: '10px', fontStyle: 'italic',
  },
  tagBlocked: {
    display: 'inline-block', padding: '0px 5px',
    border: '1px solid var(--color-warning)', color: 'var(--color-warning)', fontSize: '10px',
  },
  tagDropped: {
    display: 'inline-block', padding: '0px 5px',
    border: '1px solid var(--color-destructive)', color: 'var(--color-destructive)', fontSize: '10px',
  },
  rowActions: { display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 },
  btnSet: {
    padding: '2px 10px', background: 'var(--color-primary)',
    border: '1px solid var(--color-primary)', color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer',
    fontWeight: 'var(--font-weight-medium)',
  },
  btnUnblock: {
    padding: '2px 10px', background: 'transparent',
    border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pagination: {
    display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderTop: '1px solid var(--color-border)', flexShrink: 0,
  },
  pageBtn: {
    padding: '2px 8px', background: 'transparent',
    border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer',
  },
  pageNum: { fontSize: '10px', color: 'var(--color-text-disabled)' },
}
