import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  CheckCheck,
  Download,
  ExternalLink,
  Globe,
  LayoutGrid,
  LogOut,
  MessageCircle,
  MessageSquareText,
  Monitor,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import {
  buildWhatsAppUrl,
  DEFAULT_FLOW_STEPS,
  PRESET_DEMO_IMAGES,
  sanitizeExternalUrl,
} from '../data/defaultData';
import { auth, googleProvider } from '../lib/firebase';
import {
  deleteFlowStep,
  deleteLead,
  deleteMenuExample,
  saveAppSettings,
  saveFlowStep,
  saveMenuExample,
  seedDefaultDataIfNeeded,
  subscribeAdminLeads,
  subscribeAdminSessions,
  verifyAdminAccess,
} from '../services/firestoreService';
import {
  AppSettings,
  FlowStep,
  Lead,
  MenuExample,
  VisitorSession,
  WidgetType,
} from '../types/vitrinehub';

type AdminTab = 'dashboard' | 'leads' | 'flow' | 'examples' | 'settings';

const QUICK_EMOJIS = ['👋', '🚀', '✅', '⚠️', '💡', '📱', '💬', '🍔', '💳', '🔥', '⚡', '🎉'];

interface AdminDashboardProps {
  settings: AppSettings;
  steps: FlowStep[];
  examples: MenuExample[];
  dbHasSettings: boolean;
  dbHasSteps: boolean;
  dbHasExamples: boolean;
  onBackToChat: () => void;
}

function toJsDate(val: unknown): Date | null {
  if (!val) return null;
  try {
    if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
      return (val as { toDate: () => Date }).toDate();
    }
    if (val instanceof Date) return val;
    const parsed = new Date(String(val));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function formatDateBr(val: unknown): string {
  const date = toJsDate(val);
  if (!date) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(val: unknown, nowMs: number): string {
  const date = toJsDate(val);
  if (!date) return '—';
  const diffSec = Math.max(0, Math.floor((nowMs - date.getTime()) / 1000));
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `há ${diffHr}h`;
  return formatDateBr(val);
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  steps,
  examples,
  dbHasSettings,
  dbHasSteps,
  dbHasExamples,
  onBackToChat,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [dataError, setDataError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Leads filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadPlanFilter, setLeadPlanFilter] = useState<'all' | 'pro' | 'setup' | 'interest'>('all');
  const [confirmDeleteLeadId, setConfirmDeleteLeadId] = useState<string | null>(null);

  // Flow editor state
  const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
  const [savingStep, setSavingStep] = useState(false);
  const [confirmDeleteStepId, setConfirmDeleteStepId] = useState<string | null>(null);

  // Examples editor state
  const [editingExample, setEditingExample] = useState<MenuExample | null>(null);
  const [savingExample, setSavingExample] = useState(false);
  const [confirmDeleteExampleId, setConfirmDeleteExampleId] = useState<string | null>(null);

  // Settings form state
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(settings);
  const [proBenefitsText, setProBenefitsText] = useState(
    settings.proPlanBenefits.join('\n')
  );
  const [setupBenefitsText, setSetupBenefitsText] = useState(
    settings.setupPlanBenefits.join('\n')
  );
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(''), 3200);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSettingsDraft(settings);
    setProBenefitsText(settings.proPlanBenefits.join('\n'));
    setSetupBenefitsText(settings.setupPlanBenefits.join('\n'));
  }, [settings]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const ok = await verifyAdminAccess(currentUser);
        setIsAdmin(ok);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (!dbHasSettings || !dbHasSteps || !dbHasExamples) {
      setSeeding(true);
    }
    void seedDefaultDataIfNeeded()
      .catch(() => {
        // Handled gracefully
      })
      .finally(() => setSeeding(false));
  }, [isAdmin, dbHasSettings, dbHasSteps, dbHasExamples]);

  useEffect(() => {
    if (!isAdmin) {
      setLeads([]);
      setSessions([]);
      return;
    }

    const unsubLeads = subscribeAdminLeads(
      (list) => setLeads(list),
      (err) => setDataError(err.message)
    );
    const unsubSessions = subscribeAdminSessions(
      (list) => setSessions(list),
      (err) => setDataError(err.message)
    );

    return () => {
      unsubLeads();
      unsubSessions();
    };
  }, [isAdmin]);

  const handleLogin = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o login com Google.'
      );
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const activeThresholdMs = 3 * 60 * 1000; // 3 minutes window for live active radar

  const metrics = useMemo(() => {
    const totalVisitors = sessions.length;
    const activeVisitors = sessions.filter((s) => {
      const dt = toJsDate(s.updatedAt);
      return dt ? nowMs - dt.getTime() <= activeThresholdMs : false;
    });
    const startedCount = sessions.filter((s) => s.startedChat).length;
    const plansCount = sessions.filter((s) => s.reachedPlans).length;
    const proClicks = sessions.filter((s) => s.clickedProPlan).length;
    const setupClicks = sessions.filter((s) => s.clickedSetupPlan).length;
    const convertedVisitors = sessions.filter(
      (s) => s.clickedProPlan || s.clickedSetupPlan
    ).length;
    const conversionRate =
      totalVisitors > 0 ? ((convertedVisitors / totalVisitors) * 100).toFixed(1) : '0.0';

    const stopMap = new Map<string, { title: string; count: number }>();
    const sourceMap = new Map<string, number>();
    let mobileCount = 0;
    let desktopCount = 0;

    for (const s of sessions) {
      const stepKey = s.currentStepTitle || s.currentStepId || 'Boas-vindas';
      const existing = stopMap.get(stepKey);
      if (existing) {
        existing.count += 1;
      } else {
        stopMap.set(stepKey, { title: stepKey, count: 1 });
      }

      const src = s.trafficSource || 'Direto';
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);

      if (s.deviceType === 'mobile') mobileCount += 1;
      else desktopCount += 1;
    }

    const stopBreakdown = Array.from(stopMap.values()).sort((a, b) => b.count - a.count);
    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return {
      activeVisitors,
      activeCount: activeVisitors.length,
      totalVisitors,
      startedCount,
      plansCount,
      proClicks,
      setupClicks,
      conversionRate,
      leadsCount: leads.length,
      stopBreakdown,
      sourceBreakdown,
      mobileCount,
      desktopCount,
    };
  }, [sessions, leads.length, nowMs]);

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps]
  );

  const sortedExamples = useMemo(
    () => [...examples].sort((a, b) => a.order - b.order),
    [examples]
  );

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (leadPlanFilter !== 'all' && lead.selectedPlan !== leadPlanFilter) {
        return false;
      }
      if (!q) return true;
      return (
        lead.businessName.toLowerCase().includes(q) ||
        lead.responsibleName.toLowerCase().includes(q) ||
        lead.businessType.toLowerCase().includes(q) ||
        lead.city.toLowerCase().includes(q) ||
        (lead.contactPhone || '').toLowerCase().includes(q)
      );
    });
  }, [leads, leadSearch, leadPlanFilter]);

  const handleExportLeadsCsv = () => {
    const headers = [
      'Estabelecimento',
      'Responsavel',
      'WhatsApp',
      'Tipo de Negocio',
      'Cidade',
      'Plano Escolhido',
      'Data',
    ];
    const rows = filteredLeads.map((l) => [
      l.businessName || '-',
      l.responsibleName || '-',
      l.contactPhone || '-',
      l.businessType || '-',
      l.city || '-',
      l.selectedPlanLabel,
      formatDateBr(l.createdAt),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitrinehub-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMoveStep = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedSteps.length) return;

    const current = sortedSteps[index];
    const neighbor = sortedSteps[targetIndex];
    await saveFlowStep({ ...current, order: targetIndex });
    await saveFlowStep({ ...neighbor, order: index });
    showToast('Ordem das etapas atualizada.');
  };

  const handleSaveEditingStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStep) return;
    setSavingStep(true);
    try {
      await saveFlowStep(editingStep);
      setEditingStep(null);
      showToast('Etapa salva e publicada no chat!');
    } finally {
      setSavingStep(false);
    }
  };

  const handleCreateNewStep = () => {
    const nextOrder = sortedSteps.length;
    setEditingStep({
      id: `step_custom_${Date.now()}`,
      stepKey: `etapa_${nextOrder + 1}`,
      order: nextOrder,
      title: `Nova Etapa ${nextOrder + 1}`,
      messages: ['Digite aqui a fala desta etapa do atendimento. 👋'],
      buttonText: 'Continuar 🚀',
      widgetType: 'none',
      isActive: true,
    });
  };

  const handleSaveEditingExample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExample) return;
    setSavingExample(true);
    try {
      await saveMenuExample(editingExample);
      setEditingExample(null);
      showToast('Cardápio exemplo salvo e atualizado!');
    } finally {
      setSavingExample(false);
    }
  };

  const handleCreateNewExample = () => {
    setEditingExample({
      id: `demo_${Date.now()}`,
      businessName: '',
      category: '',
      imageUrl: PRESET_DEMO_IMAGES[0].url,
      demoUrl: 'https://',
      description: '',
      order: sortedExamples.length,
      isActive: true,
    });
  };

  const handleSaveSettingsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const proBenefits = proBenefitsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const setupBenefits = setupBenefitsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await saveAppSettings({
        ...settingsDraft,
        proPlanBenefits: proBenefits.length ? proBenefits : settings.proPlanBenefits,
        setupPlanBenefits: setupBenefits.length
          ? setupBenefits
          : settings.setupPlanBenefits,
      });
      showToast('Links, números, preços e configurações salvos!');
    } finally {
      setSavingSettings(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center p-6">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-sm text-neutral-600">
          Verificando sessão administrativa...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-7 shadow-sm">
          <p className="text-xs font-semibold text-[#008069]">VitrineHub Command Center</p>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">
            Acesso Administrativo
          </h1>
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
            Entre com sua conta Google autorizada para gerenciar falas, links de cardápios, número do WhatsApp, preços, leads e acompanhar visitantes ativos em tempo real.
          </p>

          {authError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {authError}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#008069] text-white text-sm font-semibold hover:bg-[#016B58] transition-colors min-h-[46px]"
            >
              Entrar com Google
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-colors min-h-[46px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o chat comercial
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-7 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-neutral-900">Acesso restrito</h1>
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
            A conta <span className="font-semibold text-neutral-900">{user.email}</span> não possui permissão administrativa para acessar este painel.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
              Sair desta conta
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-colors"
            >
              Voltar ao atendimento público
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Ao Vivo & Métricas',
      icon: <BarChart3 className="w-4 h-4" />,
      badge: metrics.activeCount,
    },
    {
      id: 'leads',
      label: 'Leads Capturados',
      icon: <Users className="w-4 h-4" />,
      badge: metrics.leadsCount,
    },
    {
      id: 'flow',
      label: 'Falas & Fluxo',
      icon: <MessageSquareText className="w-4 h-4" />,
    },
    {
      id: 'examples',
      label: 'Links de Cardápio',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'WhatsApp, Preços & Links',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F3F5F4] text-neutral-900 flex flex-col lg:flex-row">
      {/* Executive Sidebar */}
      <aside className="w-full lg:w-[268px] bg-[#0B1E19] text-white p-4 lg:p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center justify-between lg:block pb-4 lg:pb-5 border-b border-white/10">
            <div>
              <h1 className="text-base font-bold tracking-tight">VitrineHub Executive</h1>
              <p className="text-[11px] text-emerald-200/80 truncate mt-0.5">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToChat}
              className="lg:hidden px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold"
            >
              Ver Chat
            </button>
          </div>

          <nav className="mt-4 flex lg:flex-col gap-1 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'bg-[#008069] text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-white/15 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 pt-5 border-t border-white/10">
          <button
            type="button"
            onClick={onBackToChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Visualizar Chat Público</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1320px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-200 mb-6">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Administração / {navItems.find((n) => n.id === activeTab)?.label}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {seeding && (
              <span className="text-xs font-medium text-[#008069]">
                Sincronizando dados...
              </span>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-[#008069]" />
              <span>Trocar WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('examples')}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#008069]" />
              <span>Links Cardápio</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setSeeding(true);
                await seedDefaultDataIfNeeded();
                setSeeding(false);
                showToast('Base padrão sincronizada.');
              }}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0"
            >
              Sincronizar Padrões
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-[#008069] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {dataError && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {dataError}
          </div>
        )}

        {/* TAB 1: AO VIVO & MÉTRICAS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 8 Executive KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white border border-emerald-300 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-[#008069]">
                  <span>Ativos agora (3 min)</span>
                  <Activity className="w-4 h-4" />
                </div>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.activeCount}
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">Total de visitantes</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.totalVisitors}
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">Iniciaram o chat</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.startedCount}
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">Chegaram aos planos</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.plansCount}
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">
                  Cliques Pro ({settings.proPlanPrice})
                </p>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.proClicks}
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">
                  Cliques Pacote ({settings.setupPlanPrice})
                </p>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.setupClicks}
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">Taxa de conversão</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-[#008069] mt-1.5">
                  {metrics.conversionRate}%
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <p className="text-xs font-medium text-neutral-500">Leads capturados</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-neutral-900 mt-1.5">
                  {metrics.leadsCount}
                </p>
              </div>
            </div>

            {/* Live Active Visitors Radar */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Visitantes ativos em tempo real
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Pessoas navegando no atendimento comercial neste exato momento (últimos 3 minutos)
                  </p>
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold text-[#008069]">
                  {metrics.activeCount} online
                </span>
              </div>

              {metrics.activeVisitors.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-neutral-500">
                  Nenhum visitante ativo nos últimos 3 minutos. Assim que alguém abrir o link do anúncio, aparecerá aqui ao vivo.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Sessão</th>
                        <th className="px-4 py-2.5 font-semibold">Etapa atual</th>
                        <th className="px-4 py-2.5 font-semibold">Origem</th>
                        <th className="px-4 py-2.5 font-semibold">Dispositivo</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Último sinal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {metrics.activeVisitors.map((v) => (
                        <tr key={v.id} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                            {v.sessionId.slice(0, 14)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#008069]">
                            {v.currentStepTitle}
                          </td>
                          <td className="px-4 py-3 text-neutral-700">
                            {v.trafficSource || 'Direto'}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            <span className="inline-flex items-center gap-1">
                              {v.deviceType === 'mobile' ? (
                                <Smartphone className="w-3.5 h-3.5" />
                              ) : (
                                <Monitor className="w-3.5 h-3.5" />
                              )}
                              <span>{v.deviceType === 'mobile' ? 'Celular' : 'Computador'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-neutral-600">
                            {formatTimeAgo(v.updatedAt, nowMs)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Funnel & Acquisition Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-5">
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  Em qual etapa cada visitante parou
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Diagnóstico de retenção e pontos de saída no funil comercial
                </p>

                {metrics.stopBreakdown.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-6 text-center">
                    Nenhuma sessão registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.stopBreakdown.map((item) => {
                      const pct =
                        metrics.totalVisitors > 0
                          ? Math.round((item.count / metrics.totalVisitors) * 100)
                          : 0;
                      return (
                        <div key={item.title}>
                          <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                            <span className="font-medium text-neutral-800">{item.title}</span>
                            <span className="font-mono tabular-nums text-neutral-600">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#008069] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-5 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 mb-1">
                    Origem de Tráfego (Anúncios)
                  </h3>
                  <p className="text-xs text-neutral-500 mb-3">
                    Detectado via parâmetro ?utm_source= ou referência
                  </p>
                  {metrics.sourceBreakdown.length === 0 ? (
                    <p className="text-xs text-neutral-500">Sem dados ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {metrics.sourceBreakdown.map((src) => (
                        <div
                          key={src.source}
                          className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-neutral-100 last:border-0"
                        >
                          <span className="inline-flex items-center gap-2 font-medium text-neutral-800">
                            <Globe className="w-3.5 h-3.5 text-[#008069]" />
                            <span>{src.source}</span>
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-neutral-700">
                            {src.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-xs font-semibold text-neutral-600 mb-2">
                    Dispositivos dos visitantes
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" /> Celular
                      </span>
                      <p className="font-mono tabular-nums text-lg font-bold text-neutral-900 mt-0.5">
                        {metrics.mobileCount}
                      </p>
                    </div>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5" /> Computador
                      </span>
                      <p className="font-mono tabular-nums text-lg font-bold text-neutral-900 mt-0.5">
                        {metrics.desktopCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Visitor Sessions Log */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200">
                <h3 className="text-base font-bold text-neutral-900">
                  Histórico completo de sessões
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Sessão</th>
                      <th className="px-4 py-3 font-semibold">Etapa atual</th>
                      <th className="px-4 py-3 font-semibold">Origem</th>
                      <th className="px-4 py-3 font-semibold">Dispositivo</th>
                      <th className="px-4 py-3 font-semibold">Plano Clicado</th>
                      <th className="px-4 py-3 font-semibold text-right">Atividade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                          Sem sessões registradas até o momento.
                        </td>
                      </tr>
                    ) : (
                      sessions.slice(0, 40).map((s) => {
                        const dt = toJsDate(s.updatedAt);
                        const isLive = dt ? nowMs - dt.getTime() <= activeThresholdMs : false;
                        return (
                          <tr key={s.id} className="hover:bg-neutral-50/70">
                            <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                              {s.sessionId.slice(0, 14)}
                              {isLive && (
                                <span className="ml-2 text-[10px] font-sans font-semibold text-[#008069]">
                                  (Ativo)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-neutral-900">
                              {s.currentStepTitle}
                            </td>
                            <td className="px-4 py-3 text-neutral-600">
                              {s.trafficSource || 'Direto'}
                            </td>
                            <td className="px-4 py-3 text-neutral-600">
                              {s.deviceType === 'mobile' ? 'Celular' : 'Desktop'}
                            </td>
                            <td className="px-4 py-3 text-neutral-800 font-medium">
                              {s.clickedSetupPlan && s.clickedProPlan
                                ? 'Pro + Pacote'
                                : s.clickedSetupPlan
                                  ? 'Pacote Completo'
                                  : s.clickedProPlan
                                    ? 'Plano Pro'
                                    : 'Nenhum'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-neutral-500">
                              {formatDateBr(s.updatedAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEADS CAPTURADOS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Buscar por estabelecimento, responsável, cidade..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
                  {(['all', 'pro', 'setup', 'interest'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setLeadPlanFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        leadPlanFilter === f
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {f === 'all'
                        ? 'Todos'
                        : f === 'pro'
                          ? 'Plano Pro'
                          : f === 'setup'
                            ? 'Pacote'
                            : 'Base Futura'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportLeadsCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008069] text-white text-xs font-semibold hover:bg-[#016B58] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Estabelecimento</th>
                      <th className="px-4 py-3 font-semibold">Responsável</th>
                      <th className="px-4 py-3 font-semibold">WhatsApp</th>
                      <th className="px-4 py-3 font-semibold">Negócio</th>
                      <th className="px-4 py-3 font-semibold">Cidade</th>
                      <th className="px-4 py-3 font-semibold">Interesse</th>
                      <th className="px-4 py-3 font-semibold text-right">Data</th>
                      <th className="px-4 py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                          Nenhum interessado encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-neutral-50/70">
                          <td className="px-4 py-3 font-semibold text-neutral-900">
                            {lead.businessName || 'Não informado'}
                          </td>
                          <td className="px-4 py-3 text-neutral-700">
                            {lead.responsibleName || 'Não informado'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                            {lead.contactPhone || '—'}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {lead.businessType || '—'}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">{lead.city || '—'}</td>
                          <td className="px-4 py-3 font-medium text-[#008069]">
                            {lead.selectedPlanLabel}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-neutral-500">
                            {formatDateBr(lead.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {confirmDeleteLeadId === lead.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteLead(lead.id);
                                    setConfirmDeleteLeadId(null);
                                    showToast('Lead removido.');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLeadId(null)}
                                  className="px-2 py-1 rounded-lg border border-neutral-200 text-xs"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteLeadId(lead.id)}
                                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                aria-label="Excluir lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FALAS & FLUXO */}
        {activeTab === 'flow' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                Troque qualquer fala, texto de botão, emojis ou ordem das etapas do atendimento.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    for (const step of DEFAULT_FLOW_STEPS) {
                      await saveFlowStep(step);
                    }
                    showToast('Falas recomendadas aplicadas ao atendimento.');
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
                >
                  Aplicar falas recomendadas
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewStep}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#008069] text-white text-xs sm:text-sm font-semibold hover:bg-[#016B58] transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Etapa</span>
                </button>
              </div>
            </div>

            {editingStep && (
              <form
                onSubmit={handleSaveEditingStep}
                className="bg-white border-2 border-[#008069] rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 className="text-base font-bold text-neutral-900">
                      Editando: {editingStep.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingStep(null)}
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Título da etapa
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={editingStep.title}
                        onChange={(e) =>
                          setEditingStep({ ...editingStep, title: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Texto do botão
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={editingStep.buttonText}
                        onChange={(e) =>
                          setEditingStep({ ...editingStep, buttonText: e.target.value })
                        }
                        placeholder="Ex: Quero conhecer 💡"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Bloco anexo
                      </label>
                      <select
                        value={editingStep.widgetType}
                        onChange={(e) =>
                          setEditingStep({
                            ...editingStep,
                            widgetType: e.target.value as WidgetType,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm bg-white"
                      >
                        <option value="none">Somente falas</option>
                        <option value="benefits_list">Lista de benefícios</option>
                        <option value="menu_examples">Exemplos de cardápios</option>
                        <option value="comparison">Comparativo VitrineHub</option>
                        <option value="plans">Cartões de Planos + NFC</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-700">
                        Falas desta etapa
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStep({
                            ...editingStep,
                            messages: [...editingStep.messages, ''],
                          })
                        }
                        className="text-xs font-semibold text-[#008069] hover:underline"
                      >
                        + Adicionar balão de fala
                      </button>
                    </div>

                    {editingStep.messages.map((msg, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex gap-2 items-start">
                          <textarea
                            rows={3}
                            required
                            value={msg}
                            onChange={(e) => {
                              const next = [...editingStep.messages];
                              next[idx] = e.target.value;
                              setEditingStep({ ...editingStep, messages: next });
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-sm"
                          />
                          {editingStep.messages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = editingStep.messages.filter((_, i) => i !== idx);
                                setEditingStep({ ...editingStep, messages: next });
                              }}
                              className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50"
                              aria-label="Remover fala"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[11px] text-neutral-400 mr-1">
                            Inserir emoji:
                          </span>
                          {QUICK_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                const next = [...editingStep.messages];
                                next[idx] = `${next[idx]}${em}`;
                                setEditingStep({ ...editingStep, messages: next });
                              }}
                              className="px-1.5 py-0.5 rounded hover:bg-neutral-100 text-sm"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStep.isActive}
                        onChange={(e) =>
                          setEditingStep({ ...editingStep, isActive: e.target.checked })
                        }
                        className="rounded border-neutral-300 text-[#008069]"
                      />
                      <span>Etapa ativa</span>
                    </label>

                    <button
                      type="submit"
                      disabled={savingStep}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#008069] text-white text-sm font-semibold hover:bg-[#016B58]"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingStep ? 'Salvando...' : 'Salvar etapa'}</span>
                    </button>
                  </div>
                </div>

                {/* Live WhatsApp Preview */}
                <div className="lg:col-span-5 flex flex-col border border-neutral-200 rounded-xl overflow-hidden bg-[#EFEAE2]">
                  <div className="bg-[#008069] text-white px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between">
                    <span>Prévia ao vivo no WhatsApp</span>
                    <span className="text-emerald-100 font-normal">online</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[360px]">
                    {editingStep.messages.map((m, i) => {
                      const interpolated = (m || '...')
                        .replace(/\{\{proPrice\}\}/g, settings.proPlanPrice)
                        .replace(/\{\{setupPrice\}\}/g, settings.setupPlanPrice)
                        .replace(/\{\{proName\}\}/g, settings.proPlanName)
                        .replace(/\{\{setupName\}\}/g, settings.setupPlanName);
                      const parts = interpolated.split(/(\*[^*\n]+\*)/g);
                      return (
                        <div
                          key={i}
                          className="bg-white rounded-lg rounded-tl-none px-3 py-2 text-[13px] text-[#111B21] shadow-xs max-w-[92%] whitespace-pre-line"
                        >
                          {parts.map((part, pIdx) =>
                            part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
                              <strong key={pIdx} className="font-semibold">
                                {part.slice(1, -1)}
                              </strong>
                            ) : (
                              <React.Fragment key={pIdx}>{part}</React.Fragment>
                            )
                          )}
                        </div>
                      );
                    })}
                    {editingStep.buttonText && (
                      <div className="flex justify-end pt-1">
                        <div className="bg-[#D9FDD3] rounded-lg rounded-tr-none px-3 py-1.5 text-[13px] text-[#111B21] shadow-xs inline-flex items-center gap-1.5">
                          <span>{editingStep.buttonText}</span>
                          <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              {sortedSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono tabular-nums font-semibold text-[#008069]">
                        Etapa {index + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{step.isActive ? 'Ativa' : 'Oculta'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{step.messages.length} falas</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 truncate mt-0.5 max-w-2xl">
                      {step.messages[0]}
                    </p>
                    {step.buttonText && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Botão: <span className="font-semibold text-neutral-800">{step.buttonText}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveStep(index, -1)}
                      className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-35"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === sortedSteps.length - 1}
                      onClick={() => handleMoveStep(index, 1)}
                      className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-35"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStep({ ...step })}
                      className="px-3.5 py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
                    >
                      Editar falas
                    </button>
                    {confirmDeleteStepId === step.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteFlowStep(step.id);
                          setConfirmDeleteStepId(null);
                          showToast('Etapa removida.');
                        }}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStepId(step.id)}
                        className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                        title="Excluir etapa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LINKS DE CARDÁPIO EXEMPLO */}
        {activeTab === 'examples' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                Gerencie os exemplos reais exibidos no chat: nome, foto, categoria e o link do cardápio demonstrativo.
              </p>
              <button
                type="button"
                onClick={handleCreateNewExample}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#008069] text-white text-xs sm:text-sm font-semibold hover:bg-[#016B58] shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cardápio</span>
              </button>
            </div>

            {editingExample && (
              <form
                onSubmit={handleSaveEditingExample}
                className="bg-white border-2 border-[#008069] rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <h3 className="text-base font-bold text-neutral-900">
                    {editingExample.businessName || 'Novo Exemplo de Cardápio'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingExample(null)}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Nome do estabelecimento
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={editingExample.businessName}
                      onChange={(e) =>
                        setEditingExample({
                          ...editingExample,
                          businessName: e.target.value,
                        })
                      }
                      placeholder="Ex: Brava Smash Burger"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Categoria do negócio
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={editingExample.category}
                      onChange={(e) =>
                        setEditingExample({
                          ...editingExample,
                          category: e.target.value,
                        })
                      }
                      placeholder="Ex: Hamburgueria Artesanal"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Link do cardápio demonstrativo
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={600}
                      value={editingExample.demoUrl}
                      onChange={(e) =>
                        setEditingExample({
                          ...editingExample,
                          demoUrl: e.target.value,
                        })
                      }
                      placeholder="https://vitrinehub.com.br/exemplo"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      URL da imagem de pré-visualização
                    </label>
                    <input
                      type="text"
                      maxLength={600}
                      value={editingExample.imageUrl}
                      onChange={(e) =>
                        setEditingExample({
                          ...editingExample,
                          imageUrl: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-500 mb-1.5">
                    Ou selecione uma imagem pronta:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_DEMO_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setEditingExample({ ...editingExample, imageUrl: preset.url })
                        }
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium hover:bg-neutral-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Descrição curta
                  </label>
                  <input
                    type="text"
                    maxLength={350}
                    value={editingExample.description}
                    onChange={(e) =>
                      setEditingExample({
                        ...editingExample,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingExample.isActive}
                      onChange={(e) =>
                        setEditingExample({
                          ...editingExample,
                          isActive: e.target.checked,
                        })
                      }
                      className="rounded border-neutral-300 text-[#008069]"
                    />
                    <span>Exibir no chat público</span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingExample}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#008069] text-white text-sm font-semibold hover:bg-[#016B58]"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingExample ? 'Salvando...' : 'Salvar cardápio'}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedExamples.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-white border border-neutral-200 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={sanitizeExternalUrl(ex.imageUrl)}
                      alt={ex.businessName}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[16/9] object-cover border-b border-neutral-200"
                    />
                    <div className="p-4">
                      <p className="text-xs text-neutral-500">
                        {ex.category} · {ex.isActive ? 'Ativo' : 'Oculto'}
                      </p>
                      <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                        {ex.businessName}
                      </h3>
                      <p className="text-xs text-neutral-600 mt-1">{ex.description}</p>
                      <p className="text-xs font-mono text-neutral-500 truncate mt-2 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100">
                        {ex.demoUrl}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pb-4 flex items-center justify-between gap-2">
                    <a
                      href={sanitizeExternalUrl(ex.demoUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#008069] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Testar link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingExample({ ...ex })}
                        className="px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold"
                      >
                        Trocar link / Editar
                      </button>
                      {confirmDeleteExampleId === ex.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteMenuExample(ex.id);
                            setConfirmDeleteExampleId(null);
                            showToast('Exemplo removido.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteExampleId(ex.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                          aria-label="Excluir exemplo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: WHATSAPP, PREÇOS & LINKS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettingsForm} className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                WhatsApp Comercial & Link Oficial de Contratação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Nome exibido no chat
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.brandName}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, brandName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Status exibido
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.statusLabel}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, statusLabel: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Link oficial de contratação do Plano Pro
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={settingsDraft.proCheckoutUrl}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          proCheckoutUrl: e.target.value,
                        })
                      }
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm font-mono"
                    />
                    <a
                      href={sanitizeExternalUrl(settingsDraft.proCheckoutUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1 shrink-0"
                    >
                      Testar
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Número do WhatsApp comercial (DDI + DDD + Número)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={settingsDraft.whatsappNumber}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          whatsappNumber: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      placeholder="5511999999999"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm font-mono"
                    />
                    <a
                      href={buildWhatsAppUrl(
                        settingsDraft.whatsappNumber,
                        settingsDraft.whatsappPrefillMessage
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-[#008069] text-white text-xs font-semibold hover:bg-[#016B58] inline-flex items-center gap-1 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Testar
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem inicial pré-preenchida para o WhatsApp
                </label>
                <textarea
                  rows={2}
                  required
                  value={settingsDraft.whatsappPrefillMessage}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      whatsappPrefillMessage: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  Link gerado:{' '}
                  <span className="font-mono text-[#008069] break-all">
                    {buildWhatsAppUrl(
                      settingsDraft.whatsappNumber,
                      settingsDraft.whatsappPrefillMessage
                    )}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Plano Pro Config */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
                <h3 className="text-base font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                  Plano Pro — Faça Você Mesmo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Nome do plano
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.proPlanName}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          proPlanName: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Preço exibido
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.proPlanPrice}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          proPlanPrice: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={settingsDraft.proPlanDescription}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        proPlanDescription: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Benefícios (1 por linha)
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={proBenefitsText}
                    onChange={(e) => setProBenefitsText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Texto do botão
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.proPlanButtonText}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        proPlanButtonText: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
              </div>

              {/* Setup Package Config */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
                <h3 className="text-base font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                  Pacote de Configuração Completa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Nome do pacote
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.setupPlanName}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          setupPlanName: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Preço exibido
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.setupPlanPrice}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          setupPlanPrice: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={settingsDraft.setupPlanDescription}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        setupPlanDescription: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Itens inclusos (1 por linha)
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={setupBenefitsText}
                    onChange={(e) => setSetupBenefitsText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Explicação da Plaquinha NFC + QR Code
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={settingsDraft.setupPlanNfcNote}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        setupPlanNfcNote: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Texto do botão
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.setupPlanButtonText}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        setupPlanButtonText: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#008069] text-white text-sm font-semibold hover:bg-[#016B58] transition-colors min-h-[46px]"
              >
                <Save className="w-4 h-4" />
                <span>
                  {savingSettings ? 'Salvando alterações...' : 'Salvar todas as configurações'}
                </span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
