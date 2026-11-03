import { describe, expect, it, vi } from 'vitest'
import { AbuseReportService } from './AbuseReportService'
import { AbuseReportRepository } from '@/repositories/AbuseReportRepository'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('AbuseReportService', () => {
  it('report delegates the dto verbatim', async () => {
    const report = vi.fn().mockResolvedValue(ok('rep-1'))
    const svc = new AbuseReportService(
      mockRepository<AbuseReportRepository>({ report })
    )
    const dto = {
      campaignId: 'camp-1',
      reason: 'fraud' as const,
      details: 'stolen photos',
      contact: 'witness@example.com',
    }

    const res = await svc.report(dto)

    expect(report).toHaveBeenCalledWith(dto)
    expect(res).toEqual(ok('rep-1'))
  })

  it('propagates errors untouched', async () => {
    const report = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'Campaign not found' })
    const svc = new AbuseReportService(
      mockRepository<AbuseReportRepository>({ report })
    )

    expect(await svc.report({ campaignId: 'camp-x', reason: 'other' })).toEqual(
      { data: null, error: 'Campaign not found' }
    )
  })
})
