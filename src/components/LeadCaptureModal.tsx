import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, MessageCircle, X } from 'lucide-react';
import { buildWhatsAppUrl, sanitizeExternalUrl } from '../data/defaultData';
import { submitLead } from '../services/firestoreService';
import { AppSettings, PlanChoice } from '../types/vitrinehub';

interface LeadCaptureModalProps {
  plan: PlanChoice;
  settings: AppSettings;
  sessionId: string;
  onClose: () => void;
}

export const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({
  plan,
  settings,
  sessionId,
  onClose,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedReady, setSavedReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isPro = plan === 'pro';
  const selectedPlanLabel = isPro
    ? `${settings.proPlanName} (${settings.proPlanPrice})`
    : `${settings.setupPlanName} (${settings.setupPlanPrice})`;

  const customWhatsAppMessage = (() => {
    const base = settings.whatsappPrefillMessage;
    const extras: string[] = [];
    if (businessName.trim()) extras.push(`Estabelecimento: ${businessName.trim()}`);
    if (responsibleName.trim()) extras.push(`Responsável: ${responsibleName.trim()}`);
    if (businessType.trim()) extras.push(`Tipo de negócio: ${businessType.trim()}`);
    if (city.trim()) extras.push(`Cidade: ${city.trim()}`);
    if (contactPhone.trim()) extras.push(`WhatsApp: ${contactPhone.trim()}`);
    if (extras.length === 0) return base;
    return `${base}\n\n${extras.join('\n')}`;
  })();

  const targetUrl = isPro
    ? sanitizeExternalUrl(settings.proCheckoutUrl)
    : buildWhatsAppUrl(settings.whatsappNumber, customWhatsAppMessage);

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await submitLead({
        businessName,
        responsibleName,
        businessType,
        city,
        contactPhone,
        selectedPlan: plan,
        selectedPlanLabel,
        visitorSessionId: sessionId,
      });
      setSavedReady(true);
    } catch {
      setErrorMsg('Não foi possível registrar agora, mas você pode continuar normalmente abaixo.');
      setSavedReady(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <p className="text-xs font-medium text-[#0D8A56]">
              {selectedPlanLabel}
            </p>
            <h2 id="lead-modal-title" className="text-base sm:text-lg font-bold text-neutral-900">
              {savedReady
                ? 'Tudo pronto para continuar!'
                : 'Agilize seu atendimento (opcional)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl text-neutral-500 hover:bg-neutral-100 flex items-center justify-center transition-colors"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!savedReady ? (
          <form onSubmit={handleSaveAndContinue} className="p-5 space-y-3.5">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Se quiser, informe os dados do seu negócio abaixo para nossa equipe já iniciar o contato sabendo o que você precisa. Esse preenchimento é totalmente opcional.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="lead-business"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Nome do estabelecimento
                </label>
                <input
                  id="lead-business"
                  type="text"
                  maxLength={140}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Burger da Praça"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D8A56]/30 focus:border-[#0D8A56]"
                />
              </div>

              <div>
                <label
                  htmlFor="lead-responsible"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Nome do responsável
                </label>
                <input
                  id="lead-responsible"
                  type="text"
                  maxLength={140}
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D8A56]/30 focus:border-[#0D8A56]"
                />
              </div>

              <div>
                <label
                  htmlFor="lead-type"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Tipo de negócio
                </label>
                <input
                  id="lead-type"
                  type="text"
                  maxLength={100}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="Ex: Hamburgueria, Pizzaria..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D8A56]/30 focus:border-[#0D8A56]"
                />
              </div>

              <div>
                <label
                  htmlFor="lead-city"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Cidade / Local
                </label>
                <input
                  id="lead-city"
                  type="text"
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo - SP"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D8A56]/30 focus:border-[#0D8A56]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="lead-phone"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  WhatsApp para contato (opcional)
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  maxLength={40}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D8A56]/30 focus:border-[#0D8A56]"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0D8A56] text-white text-sm font-semibold hover:bg-[#0A7045] disabled:opacity-60 transition-colors min-h-[46px]"
              >
                <span>{saving ? 'Salvando...' : 'Salvar dados e continuar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-colors min-h-[46px]"
              >
                <span>Pular e ir direto</span>
              </a>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-[#0D8A56] shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-800">
                <p className="font-semibold">Dados registrados com sucesso!</p>
                <p className="text-neutral-600 mt-0.5">
                  {isPro
                    ? 'Clique no botão abaixo para acessar a página oficial de contratação do Plano Pro.'
                    : 'Clique no botão abaixo para abrir nossa conversa no WhatsApp comercial da VitrineHub.'}
                </p>
                {errorMsg && <p className="text-xs text-amber-700 mt-1">{errorMsg}</p>}
              </div>
            </div>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#0D8A56] text-white text-sm font-semibold hover:bg-[#0A7045] transition-colors min-h-[48px]"
            >
              {isPro ? (
                <>
                  <span>Ir para contratação do Plano Pro</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir WhatsApp da VitrineHub</span>
                </>
              )}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
