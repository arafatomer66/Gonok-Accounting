import { IBaseModel, ICouchDoc } from './base.model.js';
import { ECrmInteractionType, ECrmOpportunityStage } from '../enums/crm.enum.js';

export interface ICrmInteraction extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_uuid: string;
  interaction_type: ECrmInteractionType;
  subject: string | null;
  description: string | null;
  interaction_date: number;
  duration_minutes: number;
  next_followup_date: number | null;
  followup_completed: boolean;
}

export interface ICrmOpportunity extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_uuid: string;
  title: string;
  stage: ECrmOpportunityStage;
  estimated_value: number;
  probability: number;
  expected_close_date: number | null;
  notes: string | null;
}

export interface ICrmNote extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_uuid: string;
  content: string;
  is_pinned: boolean;
}
