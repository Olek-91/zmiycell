export async function gasCall<T = unknown>(action: string, params: unknown[] = []): Promise<T> {
  const url = '/api/gas'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params })
  })
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  if (data && data.ok === false) throw new Error(data.error || 'API error')
  
  return data as T
}
