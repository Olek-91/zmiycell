// ─── API клієнт ───────────────────────────────────────────
// Всі запити йдуть через /api/gas (Vercel Serverless Function)
// яка проксіює до Google Apps Script — без CORS проблем

export async function gasCall(action, params = []) {
  const url = '/api/gas'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  if (data && data.ok === false) throw new Error(data.error || 'API error')
  return data
}
