import { describe, expect, it, vi } from 'vitest'
import { SystemAdminCampaignService } from './SystemAdminCampaignService'
import { SystemAdminCampaignRepository } from '@/repositories/SystemAdminCampaignRepository'
import { aCampaign } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('SystemAdminCampaignService', () => {
  it('getPendingCampaigns delegates without params', async () => {
    const pending = [aCampaign({ status: 'pending_review' })]
    const getPendingCampaigns = vi.fn().mockResolvedValue(ok(pending))
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({ getPendingCampaigns })
    )

    const res = await svc.getPendingCampaigns()

    expect(getPendingCampaigns).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(pending))
  })

  it('verify and reject delegate id + notes', async () => {
    const verifyCampaign = vi
      .fn()
      .mockResolvedValue(ok(aCampaign({ status: 'live' })))
    const rejectCampaign = vi
      .fn()
      .mockResolvedValue(ok(aCampaign({ status: 'rejected' })))
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({
        verifyCampaign,
        rejectCampaign,
      })
    )

    await svc.verifyCampaign('camp-1')
    const rejected = await svc.rejectCampaign('camp-1', 'bad docs')

    expect(verifyCampaign).toHaveBeenCalledWith('camp-1', undefined)
    expect(rejectCampaign).toHaveBeenCalledWith('camp-1', 'bad docs')
    expect(rejected.data?.status).toBe('rejected')
  })

  it('getPersonalCampaigns delegates without params', async () => {
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
    const getPersonalCampaigns = vi.fn().mockResolvedValue(ok(personal))
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({ getPersonalCampaigns })
    )

    const res = await svc.getPersonalCampaigns()

    expect(getPersonalCampaigns).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(personal))
  })

  it('listAbuseReports and resolveAbuseReport delegate verbatim', async () => {
    const reports = [
      {
        id: 'rep-1',
        campaign_id: 'camp-9',
        campaign_title: 'Rahim',
        campaign_slug: 'rahim',
        reason: 'fraud',
        details: null,
        contact: null,
        created_at: '2026-01-01T00:00:00Z',
        resolved_at: null,
      },
    ]
    const listAbuseReports = vi.fn().mockResolvedValue(ok(reports))
    const resolveAbuseReport = vi.fn().mockResolvedValue(ok('rep-1'))
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({
        listAbuseReports,
        resolveAbuseReport,
      })
    )

    const listed = await svc.listAbuseReports()
    const resolved = await svc.resolveAbuseReport('rep-1')

    expect(listAbuseReports).toHaveBeenCalledTimes(1)
    expect(resolveAbuseReport).toHaveBeenCalledWith('rep-1')
    expect(listed).toEqual(ok(reports))
    expect(resolved).toEqual(ok('rep-1'))
  })

  it('propagates errors untouched', async () => {
    const verifyCampaign = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'forbidden' })
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({ verifyCampaign })
    )

    expect(await svc.verifyCampaign('camp-1')).toEqual({
      data: null,
      error: 'forbidden',
    })
  })
})
