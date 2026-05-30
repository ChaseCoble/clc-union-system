// Grid unit — panels snap to powers of 2 fractions of viewport
// Change GRID_UNIT to experiment: 4 = 1/4, 8 = 1/8, 16 = 1/16
export const GRID_DIVISIONS = 8

// CSS custom properties — injected at root
export const cssVars = `
  :root {
    /* Grid */
    --grid-divisions: ${GRID_DIVISIONS};
    --grid-unit-w: calc(100vw / ${GRID_DIVISIONS});
    --grid-unit-h: calc(100vh / ${GRID_DIVISIONS});
    --panel-gap: 2px;

    /* Color */
    --bg-void:        #0a0a0b;
    --bg-base:        #0f0f11;
    --bg-surface:     #141417;
    --bg-raised:      #1a1a1f;
    --bg-highlight:   #22222a;

    --border-dim:     #1e1e26;
    --border-base:    #2a2a36;
    --border-bright:  #3a3a4a;

    --accent:         #c8922a;
    --accent-dim:     #8a6218;
    --accent-bright:  #e8b04a;
    --accent-glow:    rgba(200, 146, 42, 0.15);

    --text-primary:   #e8e8e0;
    --text-secondary: #9090a0;
    --text-dim:       #505060;
    --text-accent:    #c8922a;

    --status-ok:      #4a9a6a;
    --status-warn:    #c8922a;
    --status-error:   #9a3a3a;
    --status-severe:  #cc2222;
    --status-info:    #3a6a9a;

    /* Typography */
    --font-display:  'Syne', sans-serif;
    --font-mono:     'Azeret Mono', monospace;

    /* Motion */
    --transition-fast: 80ms ease;
    --transition-base: 150ms ease;
    --transition-slow: 300ms ease;
  }
`
