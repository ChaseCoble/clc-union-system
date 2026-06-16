import { useState } from 'react'

export default function BlockForm({ onSubmit, onCancel }) {
  const [blockType, setBlockType] = useState('DATE')
  const [blockUntil, setBlockUntil] = useState('')
  const [blockTaskId, setBlockTaskId] = useState('')

  const handleSubmit = () => {
    const payload = { block_type: blockType }
    if (blockType === 'DATE' && blockUntil) payload.block_until = blockUntil
    if (blockType === 'TASK' && blockTaskId) payload.block_task_id = blockTaskId
    onSubmit(payload)
  }

  return (
    <div style={s.form}>
      <div style={s.title}>Block task</div>
      <div style={s.row}>
        <select style={s.input} value={blockType} onChange={e => setBlockType(e.target.value)}>
          <option value="DATE">Until date</option>
          <option value="TASK">Until task completes</option>
          <option value="TIMER">Timer</option>
          <option value="MANUAL">Manual unblock</option>
        </select>
      </div>
      {blockType === 'DATE' && (
        <div style={s.row}>
          <input style={s.input} type="datetime-local" value={blockUntil}
            onChange={e => setBlockUntil(e.target.value)} />
        </div>
      )}
      {blockType === 'TASK' && (
        <div style={s.row}>
          <input style={s.input} placeholder="Task ID" value={blockTaskId}
            onChange={e => setBlockTaskId(e.target.value)} />
        </div>
      )}
      <div style={s.actions}>
        <button style={s.btnPrimary} onClick={handleSubmit}>Confirm</button>
        <button style={s.btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

const s = {
  form: {
    marginTop: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)',
  },
  title: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 'var(--spacing-xs)',
  },
  row: { marginBottom: 'var(--spacing-xs)' },
  input: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    background: 'var(--color-surface-1)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    padding: '4px 8px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  actions: { display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' },
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
