export function getWorkerColor(name: string, hex?: string) {
  if (hex) return hex
  if (!name) return '#6b7280'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 75%, 65%)`
}
