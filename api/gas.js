// api/gas.js — Vercel Serverless Function (ESM)
// Проксіює запити від браузера до Google Apps Script
// Для малих запитів — GET з params у URL
// Для великих (>1500 символів) — POST з body=JSON, щоб уникнути "Bad Request 400"

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const gasUrl = process.env.GAS_URL
  if (!gasUrl) {
    res.status(500).json({ ok: false, error: 'GAS_URL not set in Vercel Environment Variables' })
    return
  }

  const action = req.method === 'POST' ? req.body?.action : req.query.action
  const params = req.method === 'POST' ? (req.body?.params || []) : JSON.parse(req.query.params || '[]')

  if (!action) {
    res.status(400).json({ ok: false, error: 'Missing action' })
    return
  }

  // Resolve executed URL (follow redirection once) 
  async function resolveGasUrl(baseUrl) {
    const probe = await fetch(baseUrl, { method: 'GET', redirect: 'manual' })
    if (probe.status >= 300 && probe.status < 400) {
      return probe.headers.get('location') || baseUrl
    }
    return baseUrl
  }

  try {
    const paramsJson = JSON.stringify(params)

    // Decide method: use POST body if params are large to avoid GAS URL length limit
    const USE_POST = (action.length + paramsJson.length) > 1500

    let gasRes
    if (USE_POST) {
      // GAS doPost() path: send JSON body, action in query string
      const postUrl = new URL(gasUrl)
      postUrl.searchParams.set('action', action)

      // First resolve redirect
      const execUrl = await resolveGasUrl(postUrl.toString())
      const finalUrl = new URL(execUrl)
      finalUrl.searchParams.set('action', action)

      gasRes = await fetch(finalUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ action, params }),
        redirect: 'follow',
      })
    } else {
      // GAS doGet() path: send params in URL query string
      const getUrl = new URL(gasUrl)
      getUrl.searchParams.set('action', action)
      getUrl.searchParams.set('params', paramsJson)

      gasRes = await fetch(getUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'Accept': 'application/json' },
      })

      // Follow single redirect
      if (gasRes.status >= 300 && gasRes.status < 400) {
        const location = gasRes.headers.get('location')
        if (location) {
          const redirectUrl = new URL(location)
          redirectUrl.searchParams.set('action', action)
          redirectUrl.searchParams.set('params', paramsJson)
          gasRes = await fetch(redirectUrl.toString(), { method: 'GET', headers: { 'Accept': 'application/json' } })
        }
      }
    }

    const text = await gasRes.text()
    let data
    try { data = JSON.parse(text) }
    catch (_) { data = { ok: false, error: 'Invalid JSON from Apps Script: ' + text.slice(0, 300) } }

    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message })
  }
}

