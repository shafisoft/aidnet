import { BaseRepository } from './BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export type AbuseReason = 'fraud' | 'misleading' | 'completed' | 'other'

export interface ReportAbuseDto {
  campaignId: string
  reason: AbuseReason
  details?: string
  contact?: string
  turnstileToken?: string
}

/**
 * The public's fraud lever: anyone — usually NOT logged in — can flag a
 * live campaign. Anon-writable by design (report_campaign grants anon);
 * the DB validates the reason set, caps lengths, checks Turnstile and
 * applies per-IP flood caps.
 */
export class AbuseReportRepository extends BaseRepository {
  async report(dto: ReportAbuseDto): ServiceData<string> {
    return this.callRpc<string>(Rpc.Public.ReportCampaign, {
      p_campaign_id: dto.campaignId,
      p_reason: dto.reason,
      p_details: dto.details ?? null,
      p_contact: dto.contact ?? null,
      p_turnstile_token: dto.turnstileToken ?? null,
    })
  }
}
