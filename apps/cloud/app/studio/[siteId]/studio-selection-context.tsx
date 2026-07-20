'use client'

import type { SiteEditSelection } from '@coderocket/core/site-edit'
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

interface StudioSelectionValue {
  clearSelection: () => void
  pagePath: string
  selecting: boolean
  selection?: SiteEditSelection
  setSelecting: (selecting: boolean) => void
  select: (selection: SiteEditSelection) => void
}

const StudioSelectionContext = createContext<StudioSelectionValue | undefined>(undefined)

/** Share one plain-language preview selection with the conversational editing form. */
export function StudioSelectionProvider({
  children,
  pagePath
}: {
  children: ReactNode
  pagePath: string
}) {
  const [selection, setSelection] = useState<SiteEditSelection>()
  const [selecting, setSelecting] = useState(false)
  const value = useMemo<StudioSelectionValue>(
    () => ({
      clearSelection: () => setSelection(undefined),
      pagePath,
      selecting,
      selection,
      setSelecting,
      select: nextSelection => {
        setSelection(nextSelection)
        setSelecting(false)
      }
    }),
    [pagePath, selecting, selection]
  )
  return <StudioSelectionContext.Provider value={value}>{children}</StudioSelectionContext.Provider>
}

/** Read the selected preview element from a client component inside the Studio workspace. */
export function useStudioSelection(): StudioSelectionValue {
  const value = useContext(StudioSelectionContext)
  if (!value) throw new Error('Studio selection must be used inside its provider')
  return value
}
