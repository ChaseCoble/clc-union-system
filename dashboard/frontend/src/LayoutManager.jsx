import { useState, useRef, useCallback } from 'react'
import { GRID_DIVISIONS } from './theme.js'
import PanelHost from './PanelHost.jsx'
import { updateTab } from './api.js'

function snapToGrid(value, total, divisions) {
  const unit = total / divisions
  return Math.max(1, Math.round(value / unit))
}

function defaultPlacement(panelId, existingLayout) {
  const used = new Set(existingLayout.map(p => `${p.col},${p.row}`))
  for (let row = 0; row < GRID_DIVISIONS; row++) {
    for (let col = 0; col < GRID_DIVISIONS; col++) {
      if (!used.has(`${col},${row}`)) {
        return { panel_id: panelId, col, row, colSpan: 2, rowSpan: 2 }
      }
    }
  }
  return { panel_id: panelId, col: 0, row: 0, colSpan: 2, rowSpan: 2 }
}

export default function LayoutManager({ tab, panels, onLayoutChange }) {
  const gridRef   = useRef(null)
  const dragRef   = useRef(null)
  const resizeRef = useRef(null)

  const buildLayout = () => {
    const saved = tab.layout?.panels || []
    return panels.map(p => {
      const existing = saved.find(s => s.panel_id === p.panel_id)
      return existing || defaultPlacement(p.panel_id, saved)
    })
  }

  const [layout, setLayout] = useState(buildLayout)

  const saveLayout = useCallback(async (newLayout) => {
    setLayout(newLayout)
    onLayoutChange(newLayout)
    try {
      await updateTab(tab.id, { layout: { panels: newLayout } })
    } catch {
      // Non-fatal
    }
  }, [tab.id])

  const onDragStart = (e, panelId) => {
    dragRef.current = {
      panelId,
      startX: e.clientX,
      startY: e.clientY,
      initialPlacement: layout.find(p => p.panel_id === panelId),
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = (e) => {
    e.preventDefault()
    if (!dragRef.current || !gridRef.current) return
    const { panelId, startX, startY, initialPlacement } = dragRef.current
    const rect = gridRef.current.getBoundingClientRect()
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const colDelta = snapToGrid(dx, rect.width, GRID_DIVISIONS)
    const rowDelta = snapToGrid(dy, rect.height, GRID_DIVISIONS)
    const newCol = Math.max(0, Math.min(GRID_DIVISIONS - initialPlacement.colSpan, initialPlacement.col + colDelta - 1))
    const newRow = Math.max(0, Math.min(GRID_DIVISIONS - initialPlacement.rowSpan, initialPlacement.row + rowDelta - 1))
    const newLayout = layout.map(p =>
      p.panel_id === panelId ? { ...p, col: newCol, row: newRow } : p
    )
    saveLayout(newLayout)
    dragRef.current = null
  }

  const onResizeStart = (e, panelId) => {
    e.stopPropagation()
    resizeRef.current = {
      panelId,
      startX: e.clientX,
      startY: e.clientY,
      initialPlacement: layout.find(p => p.panel_id === panelId),
    }
    const onMove = (me) => {
      if (!resizeRef.current || !gridRef.current) return
      const rect = gridRef.current.getBoundingClientRect()
      const { panelId, startX, startY, initialPlacement } = resizeRef.current
      const dx = me.clientX - startX
      const dy = me.clientY - startY
      const colSpan = Math.max(1, Math.min(
        GRID_DIVISIONS - initialPlacement.col,
        initialPlacement.colSpan + snapToGrid(dx, rect.width, GRID_DIVISIONS) - 1
      ))
      const rowSpan = Math.max(1, Math.min(
        GRID_DIVISIONS - initialPlacement.row,
        initialPlacement.rowSpan + snapToGrid(dy, rect.height, GRID_DIVISIONS) - 1
      ))
      setLayout(prev => prev.map(p =>
        p.panel_id === panelId ? { ...p, colSpan, rowSpan } : p
      ))
    }
    const onUp = () => {
      if (resizeRef.current) {
        saveLayout([...layout])
        resizeRef.current = null
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const panelMap = Object.fromEntries(panels.map(p => [p.panel_id, p]))

  return (
    <div
      ref={gridRef}
      style={styles.grid}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      {layout.map(placement => {
        const panel = panelMap[placement.panel_id]
        if (!panel) return null
        return (
          <div
            key={placement.panel_id}
            draggable
            onDragStart={e => onDragStart(e, placement.panel_id)}
            style={{
              ...styles.cell,
              gridColumn: `${placement.col + 1} / span ${placement.colSpan}`,
              gridRow:    `${placement.row + 1} / span ${placement.rowSpan}`,
            }}
          >
            <PanelHost panel={panel} style={{ width: '100%', height: '100%' }} />
            <div
              style={styles.resizeHandle}
              onMouseDown={e => onResizeStart(e, placement.panel_id)}
            />
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_DIVISIONS}, 1fr)`,
    gridTemplateRows:    `repeat(${GRID_DIVISIONS}, 1fr)`,
    gap: 'var(--panel-gap)',
    padding: 'var(--panel-gap)',
    background: 'var(--color-bg)',
    overflow: 'hidden',
  },
  cell: {
    position: 'relative',
    minWidth: 0,
    minHeight: 0,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '12px',
    height: '12px',
    cursor: 'se-resize',
    zIndex: 10,
    background: 'transparent',
  },
}
