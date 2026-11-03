import {
  AbuseReportRepository,
  type AbuseReason,
  type ReportAbuseDto,
} from '@/repositories/AbuseReportRepository'
import type { ServiceData } from '@/types'

export type { AbuseReason, ReportAbuseDto }

export class AbuseReportService {
  constructor(
    private abuseReportRepo: AbuseReportRepository = new AbuseReportRepository()
  ) {}

  async report(dto: ReportAbuseDto): ServiceData<string> {
    return this.abuseReportRepo.report(dto)
  }
}

export const abuseReportService = new AbuseReportService()
