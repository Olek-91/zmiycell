/**
 * Trigger a short haptic vibration on supportive mobile devices.
 * Defaults to 15ms for a subtle "click" feel.
 */
export const haptic = (ms: number | number[] = 15): void => {
  try {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      // Chrome/Android prefers arrays for some patterns, but single numbers are standard.
      // We use an array for maximum compatibility as seen in V1.
      window.navigator.vibrate(Array.isArray(ms) ? ms : [ms])
    }
  } catch (e) {
    // Silently ignore errors (e.g., if vibration is restricted)
    console.debug('Haptic feedback failed:', e)
  }
}
