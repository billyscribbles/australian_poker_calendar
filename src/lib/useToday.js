import { useHydrated } from './useHydrated.js'
import { todayStamp, toStamp } from './calendar.js'

// Set by vite.config.js to the day the bundle was built, so the static
// document and the hydration pass agree on what "today" is. Unset in an
// environment that does not go through that config.
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE

/**
 * Today's date as a UTC-midnight stamp (see src/lib/calendar.js).
 *
 * Returns the build date until hydration has finished, then the visitor's
 * real date. See useHydrated for why the two are kept apart.
 */
export function useToday() {
  const hydrated = useHydrated()
  return hydrated || !BUILD_DATE ? todayStamp() : toStamp(BUILD_DATE)
}
