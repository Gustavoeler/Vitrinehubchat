import { Timestamp } from 'firebase/firestore';

export type WidgetType = 'none' | 'benefits_list' | 'menu_examples' | 'comparison' | 'plans';

export interface AppSettings {
  brandName: string;
  statusLabel: string;
  whatsappNumber: string;
  whatsappPrefillMessage: string;
  proCheckoutUrl: string;
  proPlanName: string;
  proPlanPrice: string;
  proPlanDescription: string;
  proPlanBenefits: string[];
  proPlanButtonText: string;
  setupPlanName: string;
  setupPlanPrice: string;
  setupPlanDescription: string;
  setupPlanBenefits: string[];
  setupPlanNfcNote: string;
  setupPlanButtonText: string;
  updatedAt?: Timestamp | Date;
}

export interface FlowStep {
  id: string;
  stepKey: string;
  order: number;
  title: string;
  messages: string[];
  buttonText: string;
  widgetType: WidgetType;
  isActive: boolean;
  updatedAt?: Timestamp | Date;
}

export interface MenuExample {
  id: string;
  businessName: string;
  category: string;
  imageUrl: string;
  demoUrl: string;
  description: string;
  order: number;
  isActive: boolean;
  updatedAt?: Timestamp | Date;
}

export type PlanChoice = 'pro' | 'setup';
export type LeadPlanType = PlanChoice | 'interest';

export interface Lead {
  id: string;
  businessName: string;
  responsibleName: string;
  businessType: string;
  city: string;
  contactPhone?: string;
  selectedPlan: LeadPlanType;
  selectedPlanLabel: string;
  visitorSessionId: string;
  createdAt?: Timestamp | Date;
}

export interface VisitorSession {
  id: string;
  sessionId: string;
  currentStepId: string;
  currentStepTitle: string;
  startedChat: boolean;
  reachedPlans: boolean;
  clickedProPlan: boolean;
  clickedSetupPlan: boolean;
  stepsVisited: string[];
  deviceType?: 'mobile' | 'desktop';
  trafficSource?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ChatTranscriptEntry {
  id: string;
  sender: 'assistant' | 'user';
  text?: string;
  widgetType?: WidgetType;
  stepId: string;
  timestamp: string;
}

export interface SavedChatProgress {
  sessionId: string;
  currentStepIndex: number;
  visitedStepIds: string[];
  transcript: ChatTranscriptEntry[];
  startedChat: boolean;
  reachedPlans: boolean;
  clickedProPlan: boolean;
  clickedSetupPlan: boolean;
  firestoreCreated: boolean;
}
