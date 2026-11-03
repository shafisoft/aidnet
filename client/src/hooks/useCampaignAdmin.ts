'use client'

import { useState, useEffect, useCallback } from 'react'
import { systemAdminCampaignService } from '@/services/SystemAdminCampaignService'
import type { AbuseReport, Campaign, PersonalCampaign } from '@/types'

export function useCampaignAdmin() {
  const [pending, setPending] = useState<Campaign[]>([])
  // Personal fundraisers skip the review queue (publish_campaign), so
  // oversight happens here: every personal campaign, live first.
  const [personal, setPersonal] = useState<PersonalCampaign[]>([])
  const [abuseReports, setAbuseReports] = useState<AbuseReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pendingRes, personalRes, abuseRes] = await Promise.all([
        systemAdminCampaignService.getPendingCampaigns(),
        systemAdminCampaignService.getPersonalCampaigns(),
        systemAdminCampaignService.listAbuseReports(),
      ])
      const firstError = pendingRes.error ?? personalRes.error ?? abuseRes.error
      if (firstError) {
        setError(firstError)
        setPending([])
        setPersonal([])
        setAbuseReports([])
      } else {
        setPending((pendingRes.data as Campaign[]) ?? [])
        setPersonal(personalRes.data ?? [])
        setAbuseReports(abuseRes.data ?? [])
        setError(null)
      }
    } catch {
      setError('Failed to load pending campaigns')
      setPending([])
      setPersonal([])
      setAbuseReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const verify = useCallback(
    async (campaignId: string, notes?: string) => {
      setActionLoading(true)
      try {
        const { error: err } = await systemAdminCampaignService.verifyCampaign(
          campaignId,
          notes
        )
        if (err) return { error: err }
        await load()
        return { error: null }
      } finally {
        setActionLoading(false)
      }
    },
    [load]
  )

  const reject = useCallback(
    async (campaignId: string, notes?: string) => {
      setActionLoading(true)
      try {
        const { error: err } = await systemAdminCampaignService.rejectCampaign(
          campaignId,
          notes
        )
        if (err) return { error: err }
        await load()
        return { error: null }
      } finally {
        setActionLoading(false)
      }
    },
    [load]
  )

  const resolveAbuseReport = useCallback(
    async (reportId: string) => {
      setActionLoading(true)
      try {
        const { error: err } =
          await systemAdminCampaignService.resolveAbuseReport(reportId)
        if (err) return { error: err }
        await load()
        return { error: null }
      } finally {
        setActionLoading(false)
      }
    },
    [load]
  )

  return {
    pending,
    personal,
    abuseReports,
    loading,
    error,
    actionLoading,
    refetch: load,
    verify,
    reject,
    resolveAbuseReport,
  }
}
