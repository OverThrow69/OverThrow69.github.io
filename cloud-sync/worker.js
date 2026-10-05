const emptyState = {
  reminders: [],
  completions: [],
  snoozes: [],
  notifications: [],
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    if (url.pathname === '/api/version' && request.method === 'GET') {
      return sendJson({
        name: 'Morries Reminder Cloud Sync',
        version: '1',
      })
    }

    if (url.pathname === '/api/state') {
      const syncKey = url.searchParams.get('key') ?? request.headers.get('x-sync-key')

      if (!syncKey) {
        return sendJson({ error: 'Missing sync key.' }, 401)
      }

      const storageKey = await createStorageKey(syncKey)

      if (request.method === 'GET') {
        const stored = await env.MORRIES_REMINDER_SYNC.get(storageKey, 'json')
        return sendJson(normalizeState(stored?.state ?? emptyState))
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        const body = await request.json()
        const state = normalizeState(body?.state ?? body)

        await env.MORRIES_REMINDER_SYNC.put(
          storageKey,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            state,
          }),
        )

        return sendJson(state)
      }
    }

    return sendJson({
      name: 'Morries Reminder Cloud Sync',
      status: 'ok',
    })
  },
}

function normalizeState(state) {
  return {
    reminders: Array.isArray(state?.reminders) ? state.reminders : [],
    completions: Array.isArray(state?.completions) ? state.completions : [],
    snoozes: Array.isArray(state?.snoozes) ? state.snoozes : [],
    notifications: Array.isArray(state?.notifications) ? state.notifications : [],
  }
}

async function createStorageKey(syncKey) {
  const encodedKey = new TextEncoder().encode(syncKey)
  const digest = await crypto.subtle.digest('SHA-256', encodedKey)
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

  return `state:${hash}`
}

function sendJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders(),
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
    status,
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'content-type, x-sync-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Origin': '*',
  }
}
