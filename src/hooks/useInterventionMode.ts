import { useCallback, useMemo, useState } from 'react'
import { decisionCache } from '../engine/decisionCache'
import {
  interventionOptions,
  readInterventionMode,
  writeInterventionMode,
  type InterventionMode,
} from '../settings/intervention'

export function useInterventionMode() {
  const [mode, setModeState] = useState<InterventionMode>(readInterventionMode)

  const setMode = useCallback((next: InterventionMode) => {
    setModeState((prev) => {
      if (prev !== next) decisionCache.clear()
      return next
    })
    writeInterventionMode(next)
  }, [])

  const options = useMemo(() => interventionOptions(mode), [mode])

  return {
    mode,
    setMode,
    options,
  }
}
