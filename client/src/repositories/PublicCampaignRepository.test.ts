import { describe, expect, it } from 'vitest'
import { PublicCampaignRepository } from './PublicCampaignRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aPublicCampaignSummary } from '@/testing/fixtures'

describe('PublicCampaignRepository', () => {
  it('getPublicCampaigns defaults all filters to null and omits p_offset', async () => {
    const campaigns = [aPublicCampaignSummary()]
    const gw = createMockRpcGateway({
      get_public_campaigns: { data: campaigns },
    })
    const res = await new PublicCampaignRepository(gw).getPublicCampaigns()

    expect(res.data).toEqual(campaigns)
    // p_offset is sent only when pagination is requested — the shim keeps
    // the client callable against a not-yet-migrated 3-arg function.
    expect(gw.callsTo('get_public_campaigns')[0].params).toEqual({
      zakat_filter: null,
      org_filter: null,
      result_limit: null,
    })
  })

  it('getPublicCampaigns maps provided filters and sends offset when set', async () => {
    const gw = createMockRpcGateway({ get_public_campaigns: { data: [] } })
    await new PublicCampaignRepository(gw).getPublicCampaigns({
      zakat: true,
      org: 'org-1',
      limit: 10,
      offset: 24,
    })

    expect(gw.callsTo('get_public_campaigns')[0].params).toEqual({
      zakat_filter: true,
      org_filter: 'org-1',
      result_limit: 10,
      p_offset: 24,
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({ get_public_campaigns: { error: 'boom' } })
    const res = await new PublicCampaignRepository(gw).getPublicCampaigns()

    expect(res).toEqual({ data: null, error: 'boom' })
  })
})
