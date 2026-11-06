'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { publicCampaignService } from '@/services/PublicCampaignService'
import type { PublicCampaignFilters, PublicCampaignSummary } from '@/types'

/** Must match the SQL-side default page size in get_public_campaigns. */
const DEFAULT_PAGE_SIZE = 24

export function usePublicCampaigns(filters: PublicCampaignFilters = {}) {
  const [campaigns, setCampaigns] = useState<PublicCampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextOffsetRef = useRef(0)

  // `false` must mean "no zakat filter" (show everything), not "exclude
  // zakat campaigns" — the RPC only filters when the arg is non-null.
  const zakat = filters.zakat ? true : null
  const org = filters.org ?? null
  const limit = filters.limit ?? null
  // hasMore is inferred: a full page came back, so another may exist. One
  // extra empty fetch on an exact multiple is the accepted cost.
  const pageSize = filters.limit ?? DEFAULT_PAGE_SIZE

  const load = useCallback(async () => {
    setLoading(true)
    nextOffsetRef.current = 0
    try {
      const { data, error: err } =
        await publicCampaignService.getPublicCampaigns({
          zakat,
          org,
          limit,
        })
      if (err) {
        setError(err)
        setCampaigns([])
        setHasMore(false)
      } else {
        const rows = (data as PublicCampaignSummary[]) ?? []
        setCampaigns(rows)
        nextOffsetRef.current = rows.length
        setHasMore(rows.length === pageSize)
        setError(null)
      }
    } catch {
      setError('Failed to load campaigns')
      setCampaigns([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [zakat, org, limit, pageSize])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const offset = nextOffsetRef.current
      const { data, error: err } =
        await publicCampaignService.getPublicCampaigns({
          zakat,
          org,
          limit,
          offset,
        })
      if (err) {
        setError(err)
        setHasMore(false)
      } else {
        const rows = (data as PublicCampaignSummary[]) ?? []
        setCampaigns(prev => [...prev, ...rows])
        nextOffsetRef.current = offset + rows.length
        setHasMore(rows.length === pageSize)
      }
    } catch {
      setError('Failed to load campaigns')
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [zakat, org, limit, pageSize, loading, loadingMore, hasMore])

  useEffect(() => {
    load()
  }, [load])

  return {
    campaigns,
    loading,
    loadingMore,
    hasMore,
    error,
    refetch: load,
    loadMore,
  }
}
