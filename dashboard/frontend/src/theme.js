// Grid unit — panels snap to powers of 2 fractions of viewport
// Change GRID_DIVISIONS to experiment: 4 = 1/4, 8 = 1/8, 16 = 1/16
export const GRID_DIVISIONS = 8

// Layout-only CSS vars — not visual tokens, not in theme files
// Visual tokens (color, typography, motion) live in static/themes/active.css
export const cssVars = `
  :root {
    --grid-divisions: ${GRID_DIVISIONS};
    --grid-unit-w: calc(100vw / ${GRID_DIVISIONS});
    --grid-unit-h: calc(100vh / ${GRID_DIVISIONS});
    --panel-gap: 2px;
  }
`
