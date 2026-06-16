export default function HealthSignals({ session, elapsed, breaking, breakSecs, queue, hyperparams }) {
  if (!session) {
    return (
      <div style={s.signals}>
        <div style={s.row}>
          <span style={s.label}>No active session</span>
        </div>
      </div>
    )
  }

  const breakRatio  = parseFloat(hyperparams['break_budget_ratio'] ?? 0.2)
  const activeMin   = Math.max(0, Math.floor(elapsed / 60))
  const breakMin    = Math.max(0, Math.floor(breakSecs / 60))
  const budgetMin   = Math.max(0, Math.floor(activeMin * breakRatio))
  const remainingBreak = Math.max(0, budgetMin - breakMin)
  const dreadCount  = queue.filter(t => t.enjoyability === 'DREAD').length
  const tasksCompleted = session.tasks_completed ?? 0

  const score = session.performance_score ?? null
  const scoreColor = score !== null
    ? score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-destructive)'
    : 'var(--color-text-disabled)'

  const breakOverBudget = breakMin > budgetMin

  const rows = [
    { label: 'Active time',       value: `${activeMin}m`,          warn: false },
    { label: 'Break taken',       value: `${breakMin}m`,           warn: breakOverBudget },
    { label: 'Break budget',      value: `${remainingBreak}m left`, warn: breakOverBudget },
    { label: 'Tasks done',        value: tasksCompleted,            warn: false },
    { label: 'Dread accumulation', value: `${dreadCount} task${dreadCount !== 1 ? 's' : ''}`, warn: dreadCount >= 2 },
  ]

  return (
    <>
      <div style={s.scoreHeader}>
        <span style={s.scoreLabel}>Queue health</span>
        <span style={{ ...s.score, color: scoreColor }}>
          {score !== null ? Math.round(score) : '—'}
        </span>
      </div>
      {breaking && (
        <div style={s.breakBanner}>ON BREAK</div>
      )}
      <div style={s.signals}>
        {dreadCount >= 2 && (
          <div style={s.banner}>Dread accumulation elevated</div>
        )}
        {breakOverBudget && (
          <div style={s.banner}>Break budget exceeded</div>
        )}
        {rows.map(({ label, value, warn }) => (
          <div key={label} style={s.row}>
            <span style={s.label}>{label}</span>
            <span style={{ ...s.value, ...(warn ? s.warn : {}) }}>{value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

const s = {
  scoreHeader: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-1)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  score: {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    lineHeight: 1,
  },
  breakBanner: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    background: 'rgba(200, 146, 42, 0.15)',
    borderBottom: '1px solid var(--color-warning)',
    color: 'var(--color-warning)',
    fontSize: 'var(--font-size-xs)',
    letterSpacing: '0.15em',
    textAlign: 'center',
    fontWeight: 'var(--font-weight-medium)',
    flexShrink: 0,
  },
  signals: { paddingTop: 'var(--spacing-xs)', flexShrink: 0 },
  banner: {
    margin: 'var(--spacing-xs) var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    border: '1px solid var(--color-warning)',
    color: 'var(--color-warning)',
    fontSize: 'var(--font-size-xs)',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)',
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    marginBottom: '1px',
  },
  value: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  warn: { color: 'var(--color-warning)' },
}
