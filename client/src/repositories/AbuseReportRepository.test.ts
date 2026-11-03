import { describe, expect, it } from 'vitest'
import { AbuseReportRepository } from './AbuseReportRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'

describe('AbuseReportRepository', () => {
  it('report maps campaign, reason and optional fields, coercing absent ones to null', async () => {
    const gw = createMockRpcGateway({
      report_campaign: { data: 'rep-1' },
    })
    const res = await new AbuseReportRepository(gw).report({
      campaignId: 'camp-1',
      reason: 'fraud',
      details: 'stolen photos',
      contact: 'witness@example.com',
    })

    expect(res.data).toBe('rep-1')
    expect(gw.callsTo('report_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_reason: 'fraud',
      p_details: 'stolen photos',
      p_contact: 'witness@example.com',
      p_turnstile_token: null,
    })
  })

  it('report sends a minimal report with nulls for everything optional', async () => {
    const gw = createMockRpcGateway({
      report_campaign: { data: 'rep-2' },
    })
    await new AbuseReportRepository(gw).report({
      campaignId: 'camp-1',
      reason: 'misleading',
    })

    expect(gw.callsTo('report_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_reason: 'misleading',
      p_details: null,
      p_contact: null,
      p_turnstile_token: null,
    })
  })

  it('report passes the turnstile token when the widget produced one', async () => {
    const gw = createMockRpcGateway({
      report_campaign: { data: 'rep-3' },
    })
    await new AbuseReportRepository(gw).report({
      campaignId: 'camp-1',
      reason: 'other',
      turnstileToken: 'tok-1',
    })

    expect(gw.callsTo('report_campaign')[0].params).toMatchObject({
      p_turnstile_token: 'tok-1',
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      report_campaign: { error: 'Campaign not found' },
    })
    const res = await new AbuseReportRepository(gw).report({
      campaignId: 'camp-x',
      reason: 'fraud',
    })

    expect(res).toEqual({ data: null, error: 'Campaign not found' })
  })
})
