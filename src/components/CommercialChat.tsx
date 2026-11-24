import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCheck,
  ChevronRight,
  Lock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { VITRINEHUB_AVATAR_URL } from '../data/defaultData';
import { syncVisitorSession } from '../services/firestoreService';
import {
  AppSettings,
  ChatTranscriptEntry,
  FlowStep,
  MenuExample,
  PlanChoice,
  SavedChatProgress,
} from '../types/vitrinehub';
import {
  BenefitsWidget,
  ComparisonWidget,
  MenuExamplesWidget,
  PlansWidget,
} from './ChatWidgets';
import { LeadCaptureModal } from './LeadCaptureModal';

const STORAGE_KEY = 'vitrinehub_chat_progress_v4';

function createSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `vh_${ts}_${rand}`;
}

function formatTimeNow(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderWhatsAppText(raw: string | undefined, settings: AppSettings): React.ReactNode {
  if (!raw) return null;
  const interpolated = raw
    .replace(/\{\{proPrice\}\}/g, settings.proPlanPrice)
    .replace(/\{\{setupPrice\}\}/g, settings.setupPlanPrice)
    .replace(/\{\{proName\}\}/g, settings.proPlanName)
    .replace(/\{\{setupName\}\}/g, settings.setupPlanName);

  const parts = interpolated.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={idx} className="font-semibold text-[#0B141A]">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function detectDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

function detectTrafficSource(): string {
  if (typeof window === 'undefined') return 'Direto';
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source') || params.get('src') || params.get('ref');
    if (utm && utm.trim()) {
      return utm.trim().slice(0, 60);
    }
    const ref = (document.referrer || '').toLowerCase();
    if (ref.includes('instagram')) return 'Instagram';
    if (ref.includes('facebook') || ref.includes('fb.com')) return 'Facebook';
    if (ref.includes('google')) return 'Google';
    if (ref.includes('tiktok')) return 'TikTok';
    return 'Direto';
  } catch {
    return 'Direto';
  }
}

function loadSavedProgress(): SavedChatProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedChatProgress;
    if (!parsed || typeof parsed.sessionId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistProgress(state: SavedChatProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

interface CommercialChatProps {
  settings: AppSettings;
  steps: FlowStep[];
  examples: MenuExample[];
  onOpenAdmin: () => void;
}

export const CommercialChat: React.FC<CommercialChatProps> = ({
  settings,
  steps,
  examples,
  onOpenAdmin,
}) => {
  const activeSteps = useMemo(
    () =>
      steps
        .filter((s) => s.isActive)
        .sort((a, b) => a.order - b.order),
    [steps]
  );

  const initialSaved = useMemo(() => loadSavedProgress(), []);
  const deviceType = useMemo(() => detectDeviceType(), []);
  const trafficSource = useMemo(() => detectTrafficSource(), []);

  const [sessionId, setSessionId] = useState<string>(
    () => initialSaved?.sessionId || createSessionId()
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    if (initialSaved && typeof initialSaved.currentStepIndex === 'number') {
      return Math.max(0, initialSaved.currentStepIndex);
    }
    return 0;
  });
  const [visitedStepIds, setVisitedStepIds] = useState<string[]>(
    () => initialSaved?.visitedStepIds || []
  );
  const [transcript, setTranscript] = useState<ChatTranscriptEntry[]>(
    () => initialSaved?.transcript || []
  );
  const [startedChat, setStartedChat] = useState<boolean>(
    () => Boolean(initialSaved?.startedChat)
  );
  const [reachedPlans, setReachedPlans] = useState<boolean>(
    () => Boolean(initialSaved?.reachedPlans)
  );
  const [clickedProPlan, setClickedProPlan] = useState<boolean>(
    () => Boolean(initialSaved?.clickedProPlan)
  );
  const [clickedSetupPlan, setClickedSetupPlan] = useState<boolean>(
    () => Boolean(initialSaved?.clickedSetupPlan)
  );
  const [firestoreCreated, setFirestoreCreated] = useState<boolean>(
    () => Boolean(initialSaved?.firestoreCreated)
  );

  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [selectedPlanModal, setSelectedPlanModal] = useState<PlanChoice | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const revealTimersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    revealTimersRef.current.forEach((t) => window.clearTimeout(t));
    revealTimersRef.current = [];
  }, []);

  const safeStepIndex = Math.min(
    currentStepIndex,
    Math.max(0, activeSteps.length - 1)
  );
  const currentStep = activeSteps[safeStepIndex] || null;
  const nextStep = activeSteps[safeStepIndex + 1] || null;

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcript.length, isTyping, scrollToBottom]);

  useEffect(() => {
    persistProgress({
      sessionId,
      currentStepIndex: safeStepIndex,
      visitedStepIds,
      transcript,
      startedChat,
      reachedPlans,
      clickedProPlan,
      clickedSetupPlan,
      firestoreCreated,
    });
  }, [
    sessionId,
    safeStepIndex,
    visitedStepIds,
    transcript,
    startedChat,
    reachedPlans,
    clickedProPlan,
    clickedSetupPlan,
    firestoreCreated,
  ]);

  const pushTelemetry = useCallback(
    async (overrides?: {
      stepId?: string;
      stepTitle?: string;
      started?: boolean;
      plans?: boolean;
      pro?: boolean;
      setup?: boolean;
      visited?: string[];
    }) => {
      const targetStep = currentStep;
      const stepId = overrides?.stepId || targetStep?.id || 'step_welcome';
      const stepTitle = overrides?.stepTitle || targetStep?.title || 'Boas-vindas';
      const visited =
        overrides?.visited ||
        (visitedStepIds.length > 0 ? visitedStepIds : [stepId]);

      const created = await syncVisitorSession({
        sessionId,
        currentStepId: stepId,
        currentStepTitle: stepTitle,
        startedChat: overrides?.started ?? startedChat,
        reachedPlans: overrides?.plans ?? reachedPlans,
        clickedProPlan: overrides?.pro ?? clickedProPlan,
        clickedSetupPlan: overrides?.setup ?? clickedSetupPlan,
        stepsVisited: visited,
        deviceType,
        trafficSource,
        alreadyCreated: firestoreCreated,
      });
      if (created && !firestoreCreated) {
        setFirestoreCreated(true);
      }
    },
    [
      clickedProPlan,
      clickedSetupPlan,
      currentStep,
      deviceType,
      firestoreCreated,
      reachedPlans,
      sessionId,
      startedChat,
      trafficSource,
      visitedStepIds,
    ]
  );

  // Live heartbeat every 45s while tab is visible so Admin sees active visitors in real time
  useEffect(() => {
    if (!currentStep) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void pushTelemetry();
      }
    }, 45000);
    return () => window.clearInterval(interval);
  }, [currentStep, pushTelemetry]);

  const playStepMessages = useCallback(
    (step: FlowStep) => {
      clearTimers();
      setPendingStepId(step.id);
      setIsTyping(true);

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const baseDelay = prefersReducedMotion ? 50 : 440;
      const msgList = step.messages.length > 0 ? step.messages : [''];

      let cumulativeDelay = 0;

      msgList.forEach((msgText, idx) => {
        cumulativeDelay += idx === 0 ? baseDelay : baseDelay + 200;
        const timerId = window.setTimeout(() => {
          setTranscript((prev) => [
            ...prev,
            {
              id: `${step.id}_msg_${idx}_${Date.now()}`,
              sender: 'assistant',
              text: msgText,
              stepId: step.id,
              timestamp: formatTimeNow(),
            },
          ]);

          const isLastMsg = idx === msgList.length - 1;
          if (isLastMsg) {
            if (step.widgetType && step.widgetType !== 'none') {
              const widgetTimer = window.setTimeout(() => {
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `${step.id}_widget_${Date.now()}`,
                    sender: 'assistant',
                    widgetType: step.widgetType,
                    stepId: step.id,
                    timestamp: formatTimeNow(),
                  },
                ]);
                setIsTyping(false);
                setPendingStepId(null);
              }, prefersReducedMotion ? 30 : 260);
              revealTimersRef.current.push(widgetTimer);
            } else {
              setIsTyping(false);
              setPendingStepId(null);
            }
          }
        }, cumulativeDelay);
        revealTimersRef.current.push(timerId);
      });
    },
    [clearTimers]
  );

  useEffect(() => {
    if (activeSteps.length === 0) return;
    if (transcript.length === 0 && !isTyping && pendingStepId === null) {
      const firstStep = activeSteps[0];
      const nextVisited = [firstStep.id];
      setVisitedStepIds(nextVisited);
      const isPlansStep = firstStep.widgetType === 'plans';
      if (isPlansStep) setReachedPlans(true);
      playStepMessages(firstStep);
      void pushTelemetry({
        stepId: firstStep.id,
        stepTitle: firstStep.title,
        visited: nextVisited,
        plans: isPlansStep,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSteps.length]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleAdvanceStep = () => {
    if (!currentStep || !nextStep || isTyping) return;

    const userLabel = currentStep.buttonText || `Avançar para ${nextStep.title}`;
    const userBubble: ChatTranscriptEntry = {
      id: `user_${currentStep.id}_${Date.now()}`,
      sender: 'user',
      text: userLabel,
      stepId: currentStep.id,
      timestamp: formatTimeNow(),
    };

    const updatedVisited = visitedStepIds.includes(nextStep.id)
      ? visitedStepIds
      : [...visitedStepIds, nextStep.id];
    const nowStarted = true;
    const nowPlans =
      reachedPlans ||
      nextStep.widgetType === 'plans' ||
      safeStepIndex + 1 === activeSteps.length - 1;

    setTranscript((prev) => [...prev, userBubble]);
    setCurrentStepIndex(safeStepIndex + 1);
    setVisitedStepIds(updatedVisited);
    setStartedChat(nowStarted);
    if (nowPlans) setReachedPlans(true);

    playStepMessages(nextStep);
    void pushTelemetry({
      stepId: nextStep.id,
      stepTitle: nextStep.title,
      started: nowStarted,
      plans: nowPlans,
      visited: updatedVisited,
    });
  };

  const handleGoBack = () => {
    if (safeStepIndex <= 0 || isTyping) return;
    clearTimers();
    const targetIndex = safeStepIndex - 1;
    const targetStep = activeSteps[targetIndex];
    if (!targetStep) return;

    let cutIndex = -1;
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].stepId === targetStep.id && transcript[i].sender === 'assistant') {
        cutIndex = i;
        break;
      }
    }

    if (cutIndex >= 0) {
      setTranscript(transcript.slice(0, cutIndex + 1));
    } else {
      setTranscript([]);
      playStepMessages(targetStep);
    }

    setCurrentStepIndex(targetIndex);
    void pushTelemetry({
      stepId: targetStep.id,
      stepTitle: targetStep.title,
    });
  };

  const handleJumpToVisitedStep = (index: number) => {
    if (isTyping || index < 0 || index >= activeSteps.length) return;
    if (index === safeStepIndex) return;
    const targetStep = activeSteps[index];
    if (!visitedStepIds.includes(targetStep.id)) return;

    if (index < safeStepIndex) {
      let cutIndex = -1;
      for (let i = transcript.length - 1; i >= 0; i--) {
        if (transcript[i].stepId === targetStep.id && transcript[i].sender === 'assistant') {
          cutIndex = i;
          break;
        }
      }
      if (cutIndex >= 0) {
        setTranscript(transcript.slice(0, cutIndex + 1));
      }
      setCurrentStepIndex(index);
      void pushTelemetry({
        stepId: targetStep.id,
        stepTitle: targetStep.title,
      });
    }
  };

  const handleRestartChat = () => {
    clearTimers();
    const firstStep = activeSteps[0];
    if (!firstStep) return;
    const freshSessionId = createSessionId();
    setSessionId(freshSessionId);
    setFirestoreCreated(false);
    setCurrentStepIndex(0);
    setVisitedStepIds([firstStep.id]);
    setTranscript([]);
    setStartedChat(false);
    setReachedPlans(false);
    setClickedProPlan(false);
    setClickedSetupPlan(false);
    setIsTyping(false);
    setPendingStepId(null);

    const timer = window.setTimeout(() => {
      playStepMessages(firstStep);
    }, 60);
    revealTimersRef.current.push(timer);
  };

  const handleSelectPlan = (plan: PlanChoice) => {
    const isPro = plan === 'pro';
    const nextPro = clickedProPlan || isPro;
    const nextSetup = clickedSetupPlan || !isPro;
    setClickedProPlan(nextPro);
    setClickedSetupPlan(nextSetup);
    setSelectedPlanModal(plan);

    void pushTelemetry({
      pro: nextPro,
      setup: nextSetup,
      plans: true,
    });
  };

  const progressPercent =
    activeSteps.length > 0
      ? Math.round(((safeStepIndex + 1) / activeSteps.length) * 100)
      : 0;

  return (
    <div className="relative min-h-screen bg-[#DFDFDC] flex flex-col items-center justify-center lg:p-4">
      {/* Authentic WhatsApp Web emerald top band on desktop */}
      <div
        aria-hidden="true"
        className="hidden lg:block fixed top-0 left-0 right-0 h-[124px] bg-[#00A884] z-0"
      />

      <div className="relative z-10 w-full max-w-[1120px] flex bg-white lg:rounded-[12px] lg:border lg:border-black/10 lg:shadow-[0_6px_24px_rgba(11,20,26,0.14)] overflow-hidden h-[100dvh] lg:h-[min(820px,calc(100vh-2rem))]">
        {/* Compact WhatsApp Web Left Sidebar */}
        <aside className="hidden lg:flex lg:w-[268px] flex-col justify-between bg-[#FFFFFF] border-r border-neutral-200/90 shrink-0">
          <div>
            <div className="bg-[#008069] text-white px-4 h-[52px] flex items-center gap-2.5">
              {!avatarFailed ? (
                <img
                  src={VITRINEHUB_AVATAR_URL}
                  alt="VitrineHub"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-8 h-8 rounded-full object-cover border border-white/25 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
                  VH
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13.5px] font-semibold truncate">VitrineHub</span>
                  <BadgeCheck className="w-3.5 h-3.5 text-[#53BDEB] shrink-0" />
                </div>
                <p className="text-[11px] text-white/80 truncate leading-tight">
                  Atendimento Comercial
                </p>
              </div>
            </div>

            <div className="p-3">
              <p className="text-[11px] font-semibold text-[#667781] mb-1.5 px-1.5">
                Etapas do atendimento
              </p>
              <nav className="space-y-0.5" aria-label="Etapas do atendimento">
                {activeSteps.map((step, idx) => {
                  const isCurrent = idx === safeStepIndex;
                  const isVisited = visitedStepIds.includes(step.id);
                  const canJump = isVisited && idx < safeStepIndex && !isTyping;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={!canJump}
                      onClick={() => handleJumpToVisitedStep(idx)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12.5px] transition-colors ${
                        isCurrent
                          ? 'bg-[#E7F8F2] text-[#006B58] font-semibold'
                          : isVisited
                            ? 'text-[#111B21] hover:bg-neutral-100 cursor-pointer'
                            : 'text-[#8696A0] cursor-default'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full text-[11px] font-mono tabular-nums flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-[#008069] text-white'
                            : isVisited
                              ? 'bg-emerald-100 text-[#008069]'
                              : 'bg-neutral-100 text-[#8696A0]'
                        }`}
                      >
                        {isVisited && !isCurrent ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="truncate">{step.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="p-3 border-t border-neutral-100 space-y-2 bg-[#F8FAF9]">
            <div className="flex items-start gap-2 text-[11px] text-[#54656F] leading-snug">
              <ShieldCheck className="w-3.5 h-3.5 text-[#008069] shrink-0 mt-0.5" />
              <span>
                Canal oficial VitrineHub. Progresso salvo automaticamente.
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-[#111B21] transition-colors min-h-[38px]"
            >
              <Lock className="w-3.5 h-3.5 text-[#008069]" />
              <span>Painel Administrativo</span>
            </button>
          </div>
        </aside>

        {/* Main WhatsApp Conversation Window */}
        <section className="flex-1 flex flex-col min-w-0 h-full">
          {/* Authentic Compact WhatsApp Business Header */}
          <header className="bg-[#008069] text-white shrink-0 z-20">
            <div className="px-3 sm:px-4 h-[50px] sm:h-[52px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {!avatarFailed ? (
                  <img
                    src={VITRINEHUB_AVATAR_URL}
                    alt={settings.brandName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-white/25 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    VH
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[14px] sm:text-[14.5px] font-semibold truncate leading-tight tracking-[-0.01em]">
                      {settings.brandName}
                    </p>
                    <BadgeCheck className="w-3.5 h-3.5 text-[#53BDEB] shrink-0" />
                  </div>
                  <p className="text-[11px] text-white/85 font-normal truncate leading-tight">
                    {isTyping ? 'digitando...' : settings.statusLabel.toLowerCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="hidden sm:inline-block font-mono tabular-nums text-[11px] text-white/80 mr-1.5">
                  {safeStepIndex + 1}/{Math.max(1, activeSteps.length)}
                </span>

                {safeStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handleRestartChat}
                    title="Reiniciar conversa"
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-white/12 hover:bg-white/20 text-white transition-colors min-h-[36px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reiniciar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenAdmin}
                  aria-label="Acessar painel administrativo"
                  className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/12 hover:bg-white/20 text-white transition-colors"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Discrete Progress Bar */}
            <div
              className="h-[2px] w-full bg-black/15 overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-[#25D366] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </header>

          {/* Scrollable Chat Stream */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto chat-canvas-bg chat-scroll px-2.5 sm:px-6 py-2.5"
          >
            <div className="max-w-[640px] mx-auto">
              <div className="flex justify-center mb-2">
                <span className="text-[11px] font-medium text-[#54656F] bg-white/92 px-2.5 py-0.5 rounded-[7px] shadow-[0_1px_0.5px_rgba(11,20,26,0.08)]">
                  Hoje · Conta comercial oficial 🔒
                </span>
              </div>

              {transcript.map((entry, idx) => {
                const prev = idx > 0 ? transcript[idx - 1] : null;
                const isFirstInGroup =
                  !prev ||
                  prev.sender !== entry.sender ||
                  Boolean(prev.widgetType && prev.widgetType !== 'none');
                const groupSpacing = idx === 0 ? '' : isFirstInGroup ? 'mt-2.5' : 'mt-[3px]';

                if (entry.sender === 'user') {
                  return (
                    <div
                      key={entry.id}
                      className={`flex justify-end msg-enter ${isFirstInGroup ? 'pr-2' : 'pr-2'} ${groupSpacing}`}
                    >
                      <div
                        className={`relative bg-[#D9FDD3] text-[#111B21] rounded-[8px] px-2.5 py-1.5 max-w-[85%] sm:max-w-[68%] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                          isFirstInGroup ? 'rounded-tr-none' : ''
                        }`}
                      >
                        {isFirstInGroup && (
                          <span
                            aria-hidden="true"
                            className="absolute -right-[7px] top-0 w-2 h-3 bg-[#D9FDD3]"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                          />
                        )}
                        <div className="flow-root text-[13.5px] sm:text-[14px] leading-[1.35] whitespace-pre-line">
                          <span>{entry.text}</span>
                          <span className="float-right ml-2.5 mt-[3px] -mb-0.5 inline-flex items-center gap-0.5 text-[10.5px] leading-none text-[#667781] font-mono tabular-nums select-none">
                            <span>{entry.timestamp}</span>
                            <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (entry.widgetType && entry.widgetType !== 'none') {
                  return (
                    <div key={entry.id} className="pl-2 mt-1.5 mb-0.5 msg-enter">
                      {entry.widgetType === 'benefits_list' && <BenefitsWidget />}
                      {entry.widgetType === 'menu_examples' && (
                        <MenuExamplesWidget examples={examples} />
                      )}
                      {entry.widgetType === 'comparison' && <ComparisonWidget />}
                      {entry.widgetType === 'plans' && (
                        <PlansWidget
                          settings={settings}
                          sessionId={sessionId}
                          onSelectPlan={handleSelectPlan}
                        />
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className={`flex justify-start pl-2 msg-enter ${groupSpacing}`}
                  >
                    <div
                      className={`relative bg-white text-[#111B21] rounded-[8px] px-2.5 py-1.5 max-w-[87%] sm:max-w-[74%] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                        isFirstInGroup ? 'rounded-tl-none' : ''
                      }`}
                    >
                      {isFirstInGroup && (
                        <span
                          aria-hidden="true"
                          className="absolute -left-[7px] top-0 w-2 h-3 bg-white"
                          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
                        />
                      )}
                      <div className="flow-root text-[13.5px] sm:text-[14px] leading-[1.36] tracking-[-0.005em] whitespace-pre-line">
                        <span>{renderWhatsAppText(entry.text, settings)}</span>
                        <span className="float-right ml-2.5 mt-[4px] -mb-0.5 text-[10.5px] leading-none text-[#667781] font-mono tabular-nums select-none">
                          {entry.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start pl-2 mt-2" aria-live="polite">
                  <div className="relative bg-white rounded-[8px] rounded-tl-none px-3 py-2.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] inline-flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[7px] top-0 w-2 h-3 bg-white"
                      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
                    />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#667781] typing-dot" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#667781] typing-dot" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#667781] typing-dot" />
                    <span className="sr-only">VitrineHub está digitando</span>
                  </div>
                </div>
              )}

              {/* WhatsApp Business Interactive Quick-Reply Action */}
              {!isTyping && nextStep && (
                <div className="pl-2 mt-2 pb-1 flex flex-wrap items-center gap-1.5 msg-enter">
                  <button
                    type="button"
                    onClick={handleAdvanceStep}
                    className="group inline-flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-[8px] bg-white hover:bg-[#F7F9F8] active:bg-[#EFEFEF] border border-black/[0.06] text-[#008069] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-colors min-h-[44px]"
                  >
                    <span className="text-[13.5px] font-semibold tracking-[-0.005em]">
                      {currentStep?.buttonText || 'Continuar'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#00A884] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>

                  {safeStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-[8px] bg-white/85 hover:bg-white border border-black/[0.08] text-[#54656F] text-xs font-medium shadow-[0_1px_0.5px_rgba(11,20,26,0.06)] transition-colors min-h-[44px]"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Slim WhatsApp Composer Footer Bar */}
          <footer className="bg-[#F0F2F5] border-t border-black/[0.08] px-2.5 sm:px-4 h-[46px] flex items-center justify-between gap-2 shrink-0">
            {safeStepIndex > 0 && (
              <button
                type="button"
                disabled={isTyping}
                onClick={handleGoBack}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-black/[0.08] text-[#54656F] text-[11.5px] font-medium hover:bg-neutral-50 disabled:opacity-50 transition-colors min-h-[34px] shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <div className="flex-1 min-w-0 bg-white rounded-full px-3.5 py-1.5 text-[12px] text-[#667781] truncate shadow-[0_1px_0.5px_rgba(11,20,26,0.06)]">
              {nextStep
                ? 'Toque no botão de resposta acima...'
                : 'Selecione um dos planos acima'}
            </div>

            <span className="font-mono tabular-nums text-[11px] text-[#667781] font-medium shrink-0 px-1">
              {safeStepIndex + 1}/{Math.max(1, activeSteps.length)}
            </span>
          </footer>
        </section>
      </div>

      {selectedPlanModal && (
        <LeadCaptureModal
          plan={selectedPlanModal}
          settings={settings}
          sessionId={sessionId}
          onClose={() => setSelectedPlanModal(null)}
        />
      )}
    </div>
  );
};
