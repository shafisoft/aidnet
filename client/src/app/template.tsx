'use client'

import { type ReactNode, useEffect } from 'react'
import { syncLanguage } from '@/i18n/config'

// The user's language is applied HERE, not in the root layout: the page
// content must commit before the switch fires, or the second half of React's
// hydration renders English over prerendered Bangla (React #425/#422). The
// root `loading.tsx` boundary used to split that commit in two, which made
// every layout-level timing racy — keep segments boundary-free.
export default function Template({ children }: { children: ReactNode }) {
  useEffect(() => {
    void syncLanguage()
  }, [])

  return <>{children}</>
}
