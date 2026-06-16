import { useState } from 'react'

const HP_GROUPS = {
  'Aging': ['aging_rate', 'aging_sweep_interval', 'top_n_threshold', 'step_threshold'],
  'Queue': ['bucket_0_slots', 'bucket_1_slots', 'bucket_2_slots', 'bucket_3_slots', 'cycle_length'],
  'Session': ['max_mounted_cards', 'break_budget_ratio'],
  'Difficulty': ['difficulty_target', 'difficulty_ceiling'],
}

const INT_PARAMS = new Set([
  'bucket_0_slots', 'bucket_1_slots', 'bucket_2_slots', 'bucket_3_slots',
  'cycle_length', 'top_n_threshold', 'aging_sweep_interval', 'max_mounted_cards',
])

export default function HyperparamPanel({ params, saving, saved, onSave }) {
  const [edits, setEdits] = useState({ ...params })
  const [open, setOpen] = useState(false)

  const set = (key, val) => setEdits(e => ({ ...e, [key]: val }))

  // Sync edits when params load
  if (Object.keys(edits).length === 0 && Object.keys(params).length > 0) {
    setEdits({ ...params })
  }

  const handleSave = () => {
    const sanitized = Object.fromEntries(
      Object.entries(edits).map(([k, v]) => {
        const num = parseFloat(v)
        return [k, INT_PARAMS.has(k) ? String(Math.round(num)) : String(num)]
      })
    )
    onSave(sanitized)
  }

  return (
    <>
      <div style={s.header} onClick={() => setOpen(o => !o)}>
        <span style={s.label}>Tune hyperparameters</span>
        <span style={s.chevron}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={s.body}>
          {Object.entries(HP_GROUPS).map(([group, keys]) => (
            <div key={group} style={s.group}>
              <div style={s.groupLabel}>{group}</div>
              {keys.map(key => (
                params[key] !== undefined && (
                  <div key={key} style={s.row}>
                    <span style={s.key}>{key.replace(/_/g, ' ')}</span>
                    <input
                      style={s.input}
                      type="number"
                      step={INT_PARAMS.has(key) ? '1' : '0.01'}
                      min={INT_PARAMS.has(key) ? '0' : undefined}
                      value={edits[key] ?? params[key]}
                      onChange={e => set(key, e.target.value)}
                    />
                  </div>
                )
              ))}
            </div>
          ))}
          <div style={s.saveRow}>
            <button
              style={{ ...s.saveBtn, ...(saved ? s.saveBtnSaved : {}) }}
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? 'Saved' : saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const s = {
  header: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    flexShrink: 0,
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  chevron: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' },
  body: { padding: 'var(--spacing-xs) var(--spacing-sm)' },
  group: { marginBottom: 'var(--spacing-xs)' },
  groupLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-disabled)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: 'var(--spacing-xs) 0 3px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-xs)',
    padding: '2px 0',
  },
  key: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', flex: 1 },
  input: {
    width: '52px',
    flexShrink: 0,
    textAlign: 'right',
    padding: '2px 5px',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    background: 'var(--color-surface-1)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    outline: 'none',
  },
  saveRow: { paddingTop: 'var(--spacing-xs)' },
  saveBtn: {
    width: '100%',
    padding: '5px',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
  saveBtnSaved: {
    borderColor: 'var(--color-success)',
    color: 'var(--color-success)',
  },
}
