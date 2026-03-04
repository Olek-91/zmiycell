// api/gas.js — Vercel Serverless Function
// Проксіює запити від браузера до Google Apps Script
// Вирішує проблему CORS: браузер → Vercel → Apps Script

export default async function handler(req, res) {
  // CORS заголовки для браузера
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const gasUrl = process.env.GAS_URL
  if (!gasUrl) {
    res.status(500).json({ ok: false, error: 'GAS_URL not configured in Vercel environment variables' })
    return
  }

  // Передаємо всі query параметри від браузера до Apps Script
  const { action, params } = req.query
  if (!action) {
    res.status(400).json({ ok: false, error: 'Missing action parameter' })
    return
  }

  const url = new URL(gasUrl)
  url.searchParams.set('action', action)
  if (params) url.searchParams.set('params', params)

  try {
    const gasRes = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Apps Script redirects — потрібно слідкувати за редіректами
      redirect: 'follow',
    })

    if (!gasRes.ok) {
      res.status(502).json({ ok: false, error: `Apps Script HTTP ${gasRes.status}` })
      return
    }

    const data = await gasRes.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ ok: false, error: 'Failed to reach Apps Script: ' + err.message })
  }
}
