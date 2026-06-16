import { useState } from 'react'

const WORK_TYPES = ['DEEP_WORK', 'LIGHT_WORK', 'PHONE_WORK']
const ENJOYABILITY = ['ENJOYABLE', 'PLEASANT', 'NEUTRAL', 'DIFFICULT', 'DREAD']
const PLATFORMS = ['HackerOne', 'Bugcrowd', 'BTLO', 'HTB', 'FHSU', 'Manual']

export default function AddTaskForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    platform_id: '',
    description: '',
    work_type: 'DEEP_WORK',
    enjoyability: 'NEUTRAL',
    bucket: 1,
    urgency: 5.0,
    estimated_duration: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        bucket: parseInt(form.bucket),
        urgency: parseFloat(form.urgency),
        estimated_duration: form.estimated_duration ? parseInt(form.estimated_duration) : null,
        platform_id: form.platform_id || null,
        description: form.description || null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.form}>
      <div style={s.row}>
        <label style={s.label}>Title</label>
        <input style={s.input} value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Task title..." />
      </div>
      <div style={s.twoCol}>
        <div>
          <label style={s.label}>Work type</label>
          <select style={s.input} value={form.work_type}
            onChange={e => set('work_type', e.target.value)}>
            {WORK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Platform</label>
          <select style={s.input} value={form.platform_id}
            onChange={e => set('platform_id', e.target.value)}>
            <option value="">None</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={s.label}>Enjoyability</label>
        <div style={s.enjoyGrid}>
          {ENJOYABILITY.map(e => (
            <div key={e} style={{
              ...s.enjoyOption,
              ...(form.enjoyability === e ? s.enjoySelected : {}),
            }} onClick={() => set('enjoyability', e)}>
              {e.charAt(0) + e.slice(1).toLowerCase()}
            </div>
          ))}
        </div>
      </div>
      <div style={s.twoCol}>
        <div>
          <label style={s.label}>Bucket (0-3)</label>
          <input style={s.input} type="number" min="0" max="3" value={form.bucket}
            onChange={e => set('bucket', e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Est. duration (min)</label>
          <input style={s.input} type="number" value={form.estimated_duration}
            onChange={e => set('estimated_duration', e.target.value)}
            placeholder="Optional" />
        </div>
      </div>
      <div style={s.twoCol}>
        <div>
          <label style={s.label}>Description</label>
          <input style={s.input} value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Optional" />
        </div>
      </div>
      <div style={s.actions}>
        <button style={s.btnPrimary} onClick={handleSubmit} disabled={submitting}>
          {submitting ? '...' : 'Add task'}
        </button>
        <button style={s.btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

const s = {
  form: {
    padding: 'var(--spacing-sm)',
    background: 'var(--color-surface-1)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  row: { display: 'flex', flexDirection: 'column', gap: '3px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' },
  label: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' },
  input: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    padding: '4px 8px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  enjoyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-xs)',
    marginTop: '3px',
  },
  enjoyOption: {
    border: '1px solid var(--color-border)',
    padding: 'var(--spacing-xs)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface-2)',
    textAlign: 'center',
  },
  enjoySelected: {
    borderColor: 'var(--color-primary)',
    color: 'var(--color-primary)',
    background: 'var(--color-primary-glow)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    justifyContent: 'flex-end',
    marginTop: 'var(--spacing-xs)',
  },
  btn: {
    padding: '3px 10px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '3px 10px',
    background: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
  },
}
