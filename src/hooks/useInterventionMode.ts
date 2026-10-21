import { useCallback, useState } from 'react'
import {
  interventionOptions,
  readInterventionMode,
  writeInterventionMode,
  type InterventionMode,
} from '../settings/intervention'

export function useInterventionMode() {
  const [mode, setModeState] = useState<InterventionMode>(readInterventionMode)

  const setMode = useCallback((next: InterventionMode) => {
    setModeState(next)
    writeInterventionMode(next)
  }, [])

  return {
    mode,
    setMode,
    options: interventionOptions(mode),
  }
}
