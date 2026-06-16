const call = async (apiBase, path, opts = {}) => {
  const res = await fetch(apiBase + path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return null
  return res.json()
}

const callRaw = async (apiBase, path, opts = {}) => {
  const res = await fetch(apiBase + path, {
    ...opts,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return null
  return res.json()
}

export const api = (apiBase) => ({
  // Queue
  getQueue:      (mode = 'DEEP_WORK') => call(apiBase, `/queue?mode=${mode}`),
  recompute:     (mode = 'DEEP_WORK') => call(apiBase, `/queue/recompute?mode=${mode}`, { method: 'POST' }),

  // Session
  getSession:    ()                   => call(apiBase, '/session/current'),
  startSession:  ()                   => call(apiBase, '/session/start', { method: 'POST', body: '{}' }),
  endSession:    (active, brk)        => call(apiBase, '/session/end', {
    method: 'POST',
    body: JSON.stringify({ active_minutes: active, break_minutes: brk }),
  }),

  // Tasks
  createTask:    (payload)            => call(apiBase, '/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  completeTask:  (id, duration)       => call(apiBase, `/tasks/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ actual_duration: duration ?? null }),
  }),
  blockTask:     (id, payload)        => call(apiBase, `/tasks/${id}/block`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  mountTask:     (id)                 => call(apiBase, `/tasks/${id}/mount`,   { method: 'PATCH', body: '{}' }),
  unmountTask:   (id)                 => call(apiBase, `/tasks/${id}/unmount`, { method: 'PATCH', body: '{}' }),

  // Hyperparameters
  getHyperparams: ()                  => call(apiBase, '/hyperparameters'),
  setHyperparam:  (key, value)        => call(apiBase, `/hyperparameters/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value: String(value) }),
  }),

  // Health signals
  getSignals:    (limit = 50)         => call(apiBase, `/health/signals?limit=${limit}`),

  // Artifacts — backend uses query params not JSON body
  addArtifact:   (taskId, label, url) => callRaw(apiBase,
    `/tasks/${taskId}/artifacts?artifact_type=LINK&label=${encodeURIComponent(label)}&url=${encodeURIComponent(url)}`,
    { method: 'POST' }
  ),
  deleteArtifact: (taskId, artifactId) => callRaw(apiBase,
    `/tasks/${taskId}/artifacts/${artifactId}`,
    { method: 'DELETE' }
  ),
})
