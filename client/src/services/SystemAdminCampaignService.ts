import type {
  AbuseReport,
  Campaign,
  PersonalCampaign,
  ServiceData,
} from '@/types'
import { SystemAdminCampaignRepository } from '@/repositories/SystemAdminCampaignRepository'

export class SystemAdminCampaignService {
  constructor(
    private systemAdminCampaignRepo: SystemAdminCampaignRepository = new SystemAdminCampaignRepository()
  ) {}

  async getPendingCampaigns(): ServiceData<Campaign[]> {
    return this.systemAdminCampaignRepo.getPendingCampaigns()
  }

  async getPersonalCampaigns(): ServiceData<PersonalCampaign[]> {
    return this.systemAdminCampaignRepo.getPersonalCampaigns()
  }

  async listAbuseReports(): ServiceData<AbuseReport[]> {
    return this.systemAdminCampaignRepo.listAbuseReports()
  }

  async resolveAbuseReport(reportId: string): ServiceData<string> {
    return this.systemAdminCampaignRepo.resolveAbuseReport(reportId)
  }

  async verifyCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.systemAdminCampaignRepo.verifyCampaign(campaignId, notes)
  }

  async rejectCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.systemAdminCampaignRepo.rejectCampaign(campaignId, notes)
  }
}

export const systemAdminCampaignService = new SystemAdminCampaignService()
