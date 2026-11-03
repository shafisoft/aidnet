import { describe, expect, it } from 'vitest'
import { CampaignRepository } from './CampaignRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aCampaign, aCampaignTag } from '@/testing/fixtures'

const dto = {
  orgId: 'org-1',
  title: 'Build a school',
  slug: 'build-a-school',
}

describe('CampaignRepository', () => {
  it('createCampaign maps DTO with defaults (currency BDT, zakat false, nulls)', async () => {
    const campaign = aCampaign()
    const gw = createMockRpcGateway({ create_campaign: { data: [campaign] } })
    const res = await new CampaignRepository(gw).createCampaign(dto)

    expect(res.data).toEqual([campaign])
    expect(gw.callsTo('create_campaign')[0].params).toEqual({
      p_org_id: 'org-1',
      p_title: 'Build a school',
      p_slug: 'build-a-school',
      p_description: null,
      p_cover_image_url: null,
      p_goal_amount: null,
      p_currency: 'BDT',
      p_start_date: null,
      p_end_date: null,
      p_is_zakat_eligible: false,
      p_address: null,
    })
  })

  it('getCampaigns scopes by p_org_id', async () => {
    const campaigns = [aCampaign()]
    const gw = createMockRpcGateway({ get_campaigns: { data: campaigns } })
    const res = await new CampaignRepository(gw).getCampaigns('org-1')

    expect(res.data).toEqual(campaigns)
    expect(gw.callsTo('get_campaigns')[0].params).toEqual({ p_org_id: 'org-1' })
  })

  it('getCampaign returns raw table rows for service-level unwrap', async () => {
    const rows = [aCampaign()]
    const gw = createMockRpcGateway({ get_campaign: { data: rows } })
    const res = await new CampaignRepository(gw).getCampaign('camp-1')

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
    })
  })

  it('getCampaignBySlug passes p_slug', async () => {
    const gw = createMockRpcGateway({
      get_campaign_by_slug: { data: [aCampaign()] },
    })
    await new CampaignRepository(gw).getCampaignBySlug('build-a-school')

    expect(gw.callsTo('get_campaign_by_slug')[0].params).toEqual({
      p_slug: 'build-a-school',
    })
  })

  it('updateCampaign maps full DTO', async () => {
    const gw = createMockRpcGateway({ update_campaign: { data: aCampaign() } })
    await new CampaignRepository(gw).updateCampaign('camp-1', {
      title: 'New title',
      slug: 'new-slug',
      currency: 'USD',
      status: 'live',
    })

    expect(gw.callsTo('update_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_title: 'New title',
      p_slug: 'new-slug',
      p_description: null,
      p_cover_image_url: null,
      p_goal_amount: null,
      p_currency: 'USD',
      p_start_date: null,
      p_end_date: null,
      p_is_zakat_eligible: undefined,
      p_status: 'live',
    })
  })

  it('deleteCampaign and submitForReview pass p_campaign_id', async () => {
    const gw = createMockRpcGateway({
      delete_campaign: { data: true },
      submit_campaign_for_review: {
        data: [aCampaign({ status: 'pending_review' })],
      },
    })
    const del = await new CampaignRepository(gw).deleteCampaign('camp-1')
    const sub = await new CampaignRepository(gw).submitForReview('camp-1')

    expect(del.data).toBe(true)
    expect(sub.data?.[0]?.status).toBe('pending_review')
    expect(gw.callsTo('delete_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
    })
    expect(gw.callsTo('submit_campaign_for_review')[0].params).toEqual({
      p_campaign_id: 'camp-1',
    })
  })

  it('publish calls publish_campaign with p_campaign_id', async () => {
    const gw = createMockRpcGateway({
      publish_campaign: { data: [aCampaign({ status: 'live' })] },
    })
    const pub = await new CampaignRepository(gw).publish('camp-1')

    expect(pub.data?.[0]?.status).toBe('live')
    expect(gw.callsTo('publish_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
    })
  })

  it('campaign tags use the CampaignTag functions', async () => {
    const tags = [aCampaignTag()]
    const gw = createMockRpcGateway({
      get_campaign_tags: { data: tags },
      set_campaign_tags: { data: true },
    })
    const got = await new CampaignRepository(gw).getCampaignTags()
    const set = await new CampaignRepository(gw).setCampaignTags('camp-1', [
      'tag-1',
    ])

    expect(got.data).toEqual(tags)
    expect(set.data).toBe(true)
    expect(gw.callsTo('set_campaign_tags')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_tag_ids: ['tag-1'],
    })
  })

  it('getCampaignTagIds passes p_campaign_id to get_campaign_tag_ids', async () => {
    const tagIds = ['tag-2', 'tag-1']
    const gw = createMockRpcGateway({
      get_campaign_tag_ids: { data: tagIds },
    })
    const res = await new CampaignRepository(gw).getCampaignTagIds('camp-1')

    expect(res.data).toEqual(tagIds)
    expect(gw.callsTo('get_campaign_tag_ids')[0].params).toEqual({
      p_campaign_id: 'camp-1',
    })
  })

  it('getPaymentMethods passes p_campaign_id and returns raw rows', async () => {
    const rows = [
      {
        campaign_id: 'camp-1',
        bkash_number: '01712345678',
        bkash_account_name: null,
        nagad_number: null,
        nagad_account_name: null,
        rocket_number: null,
        rocket_account_name: null,
        bank_name: null,
        bank_account_number: null,
        bank_account_name: null,
        bank_routing_number: null,
        bank_branch: null,
        donation_url: null,
        qr_image_url: null,
        instructions: null,
        is_preferred: false,
      },
    ]
    const gw = createMockRpcGateway({
      get_campaign_payment_methods: { data: rows },
    })
    const res = await new CampaignRepository(gw).getPaymentMethods('camp-1')

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_campaign_payment_methods')[0].params).toEqual({
      p_campaign_id: 'camp-1',
    })
  })

  it('setPaymentMethods maps the form DTO onto the full RPC column set', async () => {
    const gw = createMockRpcGateway({
      set_campaign_payment_methods: { data: null },
    })
    await new CampaignRepository(gw).setPaymentMethods('camp-1', {
      bkashNumber: '01712345678',
      instructions: 'Send to personal bkash',
    })

    expect(gw.callsTo('set_campaign_payment_methods')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_bkash_number: '01712345678',
      p_bkash_account_name: null,
      p_nagad_number: null,
      p_nagad_account_name: null,
      p_rocket_number: null,
      p_rocket_account_name: null,
      p_bank_name: null,
      p_bank_account_number: null,
      p_bank_account_name: null,
      p_bank_routing_number: null,
      p_bank_branch: null,
      p_donation_url: null,
      p_qr_image_url: null,
      p_instructions: 'Send to personal bkash',
      p_is_preferred: false,
    })
  })
})
