import { BaseRepository } from './BaseRepository'
import type {
  AbuseReport,
  Campaign,
  PersonalCampaign,
  ServiceData,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class SystemAdminCampaignRepository extends BaseRepository {
  async getPendingCampaigns(): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.SystemAdminCampaign.GetPending)
  }

  async getPersonalCampaigns(): ServiceData<PersonalCampaign[]> {
    return this.callRpc<PersonalCampaign[]>(Rpc.SystemAdminCampaign.GetPersonal)
  }

  async verifyCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.SystemAdminCampaign.Verify, {
      p_campaign_id: campaignId,
      p_notes: notes ?? null,
    })
  }

  async rejectCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.SystemAdminCampaign.Reject, {
      p_campaign_id: campaignId,
      p_notes: notes ?? null,
    })
  }

  async listAbuseReports(): ServiceData<AbuseReport[]> {
    return this.callRpc<AbuseReport[]>(Rpc.SystemAdminCampaign.ListAbuseReports)
  }

  async resolveAbuseReport(reportId: string): ServiceData<string> {
    return this.callRpc<string>(Rpc.SystemAdminCampaign.ResolveAbuseReport, {
      p_report_id: reportId,
    })
  }
}
