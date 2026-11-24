import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  DEFAULT_FLOW_STEPS,
  DEFAULT_MENU_EXAMPLES,
  DEFAULT_SETTINGS,
  upgradeLegacySeededStep,
} from '../data/defaultData';
import {
  AppSettings,
  FlowStep,
  Lead,
  LeadPlanType,
  MenuExample,
  VisitorSession,
} from '../types/vitrinehub';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

export async function verifyAdminAccess(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email === BOOTSTRAP_ADMIN_EMAIL) return true;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export function subscribePublicSettings(
  onData: (settings: AppSettings, existsInDb: boolean) => void
): () => void {
  const ref = doc(db, 'app_config', 'settings');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppSettings;
        onData({ ...DEFAULT_SETTINGS, ...data }, true);
      } else {
        onData(DEFAULT_SETTINGS, false);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_config/settings');
    }
  );
}

export function subscribeFlowSteps(
  onData: (steps: FlowStep[], existsInDb: boolean) => void
): () => void {
  const q = query(collection(db, 'flow_steps'), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const items: FlowStep[] = snap.docs.map((d) => {
          const raw: FlowStep = {
            id: d.id,
            ...(d.data() as Omit<FlowStep, 'id'>),
          };
          return upgradeLegacySeededStep(raw).step;
        });
        onData(items, true);
      } else {
        onData(DEFAULT_FLOW_STEPS, false);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flow_steps');
    }
  );
}

export function subscribeMenuExamples(
  onData: (examples: MenuExample[], existsInDb: boolean) => void
): () => void {
  const q = query(collection(db, 'menu_examples'), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const items: MenuExample[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuExample, 'id'>),
        }));
        onData(items, true);
      } else {
        onData(DEFAULT_MENU_EXAMPLES, false);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu_examples');
    }
  );
}

export function subscribeAdminLeads(
  onData: (leads: Lead[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: Lead[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Lead, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, 'leads');
      }
    }
  );
}

export function subscribeAdminSessions(
  onData: (sessions: VisitorSession[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'visitor_sessions'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: VisitorSession[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VisitorSession, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, 'visitor_sessions');
      }
    }
  );
}

export async function seedDefaultDataIfNeeded(): Promise<void> {
  try {
    const settingsRef = doc(db, 'app_config', 'settings');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await saveAppSettings(DEFAULT_SETTINGS);
    }

    const stepsSnap = await getDocs(collection(db, 'flow_steps'));
    if (stepsSnap.empty) {
      for (const step of DEFAULT_FLOW_STEPS) {
        await saveFlowStep(step);
      }
    } else {
      for (const docSnap of stepsSnap.docs) {
        const raw: FlowStep = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<FlowStep, 'id'>),
        };
        const { step: upgradedStep, upgraded } = upgradeLegacySeededStep(raw);
        if (upgraded) {
          await saveFlowStep(upgradedStep);
        }
      }
    }

    const examplesSnap = await getDocs(collection(db, 'menu_examples'));
    if (examplesSnap.empty) {
      for (const ex of DEFAULT_MENU_EXAMPLES) {
        await saveMenuExample(ex);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_defaults');
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const cleanDigits = (settings.whatsappNumber || '').replace(/\D/g, '').slice(0, 20);
  const payload = {
    brandName: (settings.brandName || 'VitrineHub | Atendimento Comercial').trim().slice(0, 100),
    statusLabel: (settings.statusLabel || 'Online').trim().slice(0, 40),
    whatsappNumber: cleanDigits.length >= 8 ? cleanDigits : '5511999999999',
    whatsappPrefillMessage: (
      settings.whatsappPrefillMessage || DEFAULT_SETTINGS.whatsappPrefillMessage
    )
      .trim()
      .slice(0, 600),
    proCheckoutUrl: (settings.proCheckoutUrl || DEFAULT_SETTINGS.proCheckoutUrl)
      .trim()
      .slice(0, 600),
    proPlanName: (settings.proPlanName || DEFAULT_SETTINGS.proPlanName).trim().slice(0, 120),
    proPlanPrice: (settings.proPlanPrice || DEFAULT_SETTINGS.proPlanPrice).trim().slice(0, 40),
    proPlanDescription: (settings.proPlanDescription || DEFAULT_SETTINGS.proPlanDescription)
      .trim()
      .slice(0, 500),
    proPlanBenefits: (settings.proPlanBenefits.length
      ? settings.proPlanBenefits
      : DEFAULT_SETTINGS.proPlanBenefits
    )
      .map((b) => b.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 20),
    proPlanButtonText: (settings.proPlanButtonText || DEFAULT_SETTINGS.proPlanButtonText)
      .trim()
      .slice(0, 100),
    setupPlanName: (settings.setupPlanName || DEFAULT_SETTINGS.setupPlanName)
      .trim()
      .slice(0, 120),
    setupPlanPrice: (settings.setupPlanPrice || DEFAULT_SETTINGS.setupPlanPrice)
      .trim()
      .slice(0, 40),
    setupPlanDescription: (settings.setupPlanDescription || DEFAULT_SETTINGS.setupPlanDescription)
      .trim()
      .slice(0, 500),
    setupPlanBenefits: (settings.setupPlanBenefits.length
      ? settings.setupPlanBenefits
      : DEFAULT_SETTINGS.setupPlanBenefits
    )
      .map((b) => b.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 20),
    setupPlanNfcNote: (settings.setupPlanNfcNote || DEFAULT_SETTINGS.setupPlanNfcNote)
      .trim()
      .slice(0, 600),
    setupPlanButtonText: (settings.setupPlanButtonText || DEFAULT_SETTINGS.setupPlanButtonText)
      .trim()
      .slice(0, 100),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'app_config', 'settings'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'app_config/settings');
  }
}

export async function saveFlowStep(step: FlowStep): Promise<void> {
  const id = sanitizeId(step.id || `step_${Date.now()}`);
  const stepKey = sanitizeId(step.stepKey || id).slice(0, 64);
  const cleanMessages = step.messages
    .map((m) => m.trim().slice(0, 2500))
    .filter(Boolean)
    .slice(0, 15);

  const payload = {
    stepKey,
    order: Math.max(0, Math.min(1000, Math.round(step.order))),
    title: (step.title || 'Nova Etapa').trim().slice(0, 120),
    messages: cleanMessages.length > 0 ? cleanMessages : ['Mensagem da etapa'],
    buttonText: (step.buttonText || '').trim().slice(0, 120),
    widgetType: step.widgetType || 'none',
    isActive: Boolean(step.isActive),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'flow_steps', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `flow_steps/${id}`);
  }
}

export async function deleteFlowStep(stepId: string): Promise<void> {
  const id = sanitizeId(stepId);
  try {
    await deleteDoc(doc(db, 'flow_steps', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `flow_steps/${id}`);
  }
}

export async function saveMenuExample(example: MenuExample): Promise<void> {
  const id = sanitizeId(example.id || `demo_${Date.now()}`);
  const payload = {
    businessName: (example.businessName || 'Estabelecimento').trim().slice(0, 120),
    category: (example.category || 'Restaurante').trim().slice(0, 80),
    imageUrl: (example.imageUrl || '').trim().slice(0, 600),
    demoUrl: (example.demoUrl || '/demo/stackhouse-burger').trim().slice(0, 600),
    description: (example.description || '').trim().slice(0, 350),
    order: Math.max(0, Math.min(1000, Math.round(example.order))),
    isActive: Boolean(example.isActive),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'menu_examples', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `menu_examples/${id}`);
  }
}

export async function deleteMenuExample(exampleId: string): Promise<void> {
  const id = sanitizeId(exampleId);
  try {
    await deleteDoc(doc(db, 'menu_examples', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `menu_examples/${id}`);
  }
}

export async function submitLead(params: {
  businessName: string;
  responsibleName: string;
  businessType: string;
  city: string;
  contactPhone?: string;
  selectedPlan: LeadPlanType;
  selectedPlanLabel: string;
  visitorSessionId: string;
}): Promise<string> {
  const id = sanitizeId(`lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const payload = {
    businessName: (params.businessName || '').trim().slice(0, 140),
    responsibleName: (params.responsibleName || '').trim().slice(0, 140),
    businessType: (params.businessType || '').trim().slice(0, 100),
    city: (params.city || '').trim().slice(0, 100),
    contactPhone: (params.contactPhone || '').trim().slice(0, 40),
    selectedPlan: params.selectedPlan,
    selectedPlanLabel: (params.selectedPlanLabel || 'Plano').trim().slice(0, 140),
    visitorSessionId: sanitizeId(params.visitorSessionId),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'leads', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `leads/${id}`);
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  const id = sanitizeId(leadId);
  try {
    await deleteDoc(doc(db, 'leads', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `leads/${id}`);
  }
}

export async function syncVisitorSession(params: {
  sessionId: string;
  currentStepId: string;
  currentStepTitle: string;
  startedChat: boolean;
  reachedPlans: boolean;
  clickedProPlan: boolean;
  clickedSetupPlan: boolean;
  stepsVisited: string[];
  deviceType: 'mobile' | 'desktop';
  trafficSource: string;
  alreadyCreated: boolean;
}): Promise<boolean> {
  const sessionId = sanitizeId(params.sessionId);
  const currentStepId = sanitizeId(params.currentStepId).slice(0, 64);
  const currentStepTitle = (params.currentStepTitle || 'Início').trim().slice(0, 120);
  const stepsVisited = (params.stepsVisited.length ? params.stepsVisited : [currentStepId])
    .map((s) => sanitizeId(s).slice(0, 64))
    .slice(0, 50);
  const deviceType = params.deviceType === 'mobile' ? 'mobile' : 'desktop';
  const trafficSource = (params.trafficSource || 'Direto').trim().slice(0, 80) || 'Direto';

  const ref = doc(db, 'visitor_sessions', sessionId);
  const updateFields = {
    currentStepId,
    currentStepTitle,
    startedChat: Boolean(params.startedChat),
    reachedPlans: Boolean(params.reachedPlans),
    clickedProPlan: Boolean(params.clickedProPlan),
    clickedSetupPlan: Boolean(params.clickedSetupPlan),
    stepsVisited,
    deviceType,
    trafficSource,
    updatedAt: serverTimestamp(),
  };

  try {
    if (params.alreadyCreated) {
      try {
        await updateDoc(ref, updateFields);
        return true;
      } catch (updateErr) {
        const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
        if (msg.includes('No document to update') || msg.includes('not-found')) {
          await setDoc(ref, {
            sessionId,
            ...updateFields,
            createdAt: serverTimestamp(),
          });
          return true;
        }
        throw updateErr;
      }
    } else {
      try {
        await setDoc(ref, {
          sessionId,
          ...updateFields,
          createdAt: serverTimestamp(),
        });
        return true;
      } catch {
        await updateDoc(ref, updateFields);
        return true;
      }
    }
  } catch (error) {
    console.warn('Session telemetry sync deferred:', error);
    return params.alreadyCreated;
  }
}
