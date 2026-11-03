import { describe, expect, it } from 'vitest'
import { SystemAdminCampaignRepository } from './SystemAdminCampaignRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aCampaign } from '@/testing/fixtures'

describe('SystemAdminCampaignRepository', () => {
  it('getPendingCampaigns calls get_pending_campaigns without params', async () => {
    const pending = [aCampaign({ status: 'pending_review' })]
    const gw = createMockRpcGateway({
      get_pending_campaigns: { data: pending },
    })
    const res = await new SystemAdminCampaignRepository(
      gw
    ).getPendingCampaigns()

    expect(res.data).toEqual(pending)
    expect(gw.callsTo('get_pending_campaigns')).toEqual([
      { functionName: 'get_pending_campaigns', params: undefined },
    ])
  })

  it('verifyCampaign maps id and coerces notes to null', async () => {
    const verified = aCampaign({ status: 'live', verified_by: 'admin-1' })
    const gw = createMockRpcGateway({ verify_campaign: { data: verified } })
    const res = await new SystemAdminCampaignRepository(gw).verifyCampaign(
      'camp-1'
    )

    expect(res.data).toEqual(verified)
    expect(gw.callsTo('verify_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_notes: null,
    })
  })

  it('verifyCampaign passes notes when provided', async () => {
    const gw = createMockRpcGateway({ verify_campaign: { data: aCampaign() } })
    await new SystemAdminCampaignRepository(gw).verifyCampaign(
      'camp-1',
      'docs ok'
    )

    expect(gw.callsTo('verify_campaign')[0].params).toMatchObject({
      p_notes: 'docs ok',
    })
  })

  it('rejectCampaign maps id and notes', async () => {
    const rejected = aCampaign({ status: 'rejected' })
    const gw = createMockRpcGateway({ reject_campaign: { data: rejected } })
    const res = await new SystemAdminCampaignRepository(gw).rejectCampaign(
      'camp-1',
      'invalid docs'
    )

    expect(res.data?.status).toBe('rejected')
    expect(gw.callsTo('reject_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_notes: 'invalid docs',
    })
  })

  it('getPersonalCampaigns calls get_personal_campaigns without params', async () => {
    const personal = [
      {
        id: 'camp-9',
        title: 'Rahim',
        slug: 'rahim',
        status: 'live',
        goal_amount: 5000,
        currency: 'BDT',
        created_at: '2026-01-01T00:00:00Z',
        org_id: 'org-9',
        org_name: 'Rahim',
      },
    ]
    const gw = createMockRpcGateway({
      get_personal_campaigns: { data: personal },
    })
    const res = await new SystemAdminCampaignRepository(
      gw
    ).getPersonalCampaigns()

    expect(res.data).toEqual(personal)
    expect(gw.callsTo('get_personal_campaigns')).toEqual([
      { functionName: 'get_personal_campaigns', params: undefined },
    ])
  })

  it('listAbuseReports calls list_campaign_abuse_reports without params', async () => {
    const reports = [
      {
        id: 'rep-1',
        campaign_id: 'camp-9',
        campaign_title: 'Rahim',
        campaign_slug: 'rahim',
        reason: 'fraud',
        details: 'stolen photos',
        contact: 'witness@example.com',
        created_at: '2026-01-01T00:00:00Z',
        resolved_at: null,
      },
    ]
    const gw = createMockRpcGateway({
      list_campaign_abuse_reports: { data: reports },
    })
    const res = await new SystemAdminCampaignRepository(gw).listAbuseReports()

    expect(res.data).toEqual(reports)
    expect(gw.callsTo('list_campaign_abuse_reports')).toEqual([
      { functionName: 'list_campaign_abuse_reports', params: undefined },
    ])
  })

  it('resolveAbuseReport maps the report id', async () => {
    const gw = createMockRpcGateway({
      resolve_campaign_abuse_report: { data: 'rep-1' },
    })
    const res = await new SystemAdminCampaignRepository(gw).resolveAbuseReport(
      'rep-1'
    )

    expect(res.data).toBe('rep-1')
    expect(gw.callsTo('resolve_campaign_abuse_report')[0].params).toEqual({
      p_report_id: 'rep-1',
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      verify_campaign: { error: 'not system admin' },
    })
    const res = await new SystemAdminCampaignRepository(gw).verifyCampaign(
      'camp-1'
    )

    expect(res).toEqual({ data: null, error: 'not system admin' })
  })
})
