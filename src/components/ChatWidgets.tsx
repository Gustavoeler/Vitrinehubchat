import React, { useState } from 'react';
import {
  BookmarkPlus,
  Check,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Nfc,
  QrCode,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import {
  DEFAULT_BENEFITS_LIST,
  NFC_PLAQUE_IMAGE_URL,
  sanitizeExternalUrl,
} from '../data/defaultData';
import { submitLead } from '../services/firestoreService';
import { AppSettings, MenuExample, PlanChoice } from '../types/vitrinehub';

export const BenefitsWidget: React.FC = () => {
  return (
    <div className="space-y-1 max-w-[87%] sm:max-w-[74%]">
      {DEFAULT_BENEFITS_LIST.map((benefit, index) => (
        <div
          key={index}
          className="bg-white rounded-[8px] px-2.5 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center"
        >
          <p className="text-[13px] sm:text-[13.5px] text-[#111B21] leading-[1.34] font-medium">
            {benefit}
          </p>
        </div>
      ))}
    </div>
  );
};

const MenuExampleImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full aspect-[16/10] bg-gradient-to-br from-emerald-50 to-neutral-100 flex flex-col items-center justify-center text-neutral-500 p-3 border-b border-neutral-100">
        <Store className="w-6 h-6 text-[#008069] mb-1" />
        <span className="text-[11px] font-medium text-center text-neutral-600">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={sanitizeExternalUrl(src)}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full aspect-[16/10] object-cover border-b border-neutral-100"
    />
  );
};

export const MenuExamplesWidget: React.FC<{ examples: MenuExample[] }> = ({
  examples,
}) => {
  const activeExamples = examples.filter((e) => e.isActive);

  if (activeExamples.length === 0) {
    return (
      <div className="bg-white rounded-[8px] p-3 max-w-[87%] text-xs text-[#54656F] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        Nenhum exemplo de cardápio ativo no momento. Cadastre exemplos no painel administrativo.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[560px]">
      {activeExamples.map((example) => {
        const safeHref = sanitizeExternalUrl(example.demoUrl);
        return (
          <article
            key={example.id}
            className="bg-white rounded-[10px] overflow-hidden shadow-[0_1px_1.5px_rgba(11,20,26,0.12)] border border-black/[0.04] flex flex-col justify-between"
          >
            <div>
              <MenuExampleImage src={example.imageUrl} alt={example.businessName} />
              <div className="px-3 pt-2.5 pb-2">
                <p className="text-[11px] font-medium text-[#667781]">
                  {example.category}
                </p>
                <h3 className="text-[13.5px] font-bold text-[#111B21] mt-0.5 leading-snug">
                  {example.businessName}
                </h3>
                {example.description && (
                  <p className="text-[12px] text-[#54656F] mt-0.5 leading-[1.35] line-clamp-2">
                    {example.description}
                  </p>
                )}
              </div>
            </div>
            <div className="px-3 pb-2.5">
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#008069] text-white text-xs font-semibold hover:bg-[#016B58] active:scale-[0.99] transition-all min-h-[40px]"
              >
                <span>Conhecer cardápio</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export const ComparisonWidget: React.FC = () => {
  const vitrineHubPoints = [
    'Mensalidade fixa acessível (sem surpresas).',
    'Zero comissão sobre os seus pedidos.',
    'Seu próprio cardápio digital com a sua marca.',
    'Pedidos organizados direto no WhatsApp.',
    'Você fica com o valor real das suas vendas.',
  ];

  const marketplacePoints = [
    'Comissões que chegam a ~30% + taxas extras por pedido.',
    'Taxas adicionais que corroem sua margem de lucro.',
    'Regras e visibilidade controladas pelo aplicativo.',
    'Dependência constante do marketplace para vender.',
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[560px]">
      <div className="bg-white border border-emerald-300/70 rounded-[10px] p-3 shadow-[0_1px_1.5px_rgba(11,20,26,0.1)]">
        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-100">
          <ShieldCheck className="w-4 h-4 text-[#008069] shrink-0" />
          <h3 className="text-[13px] font-bold text-[#111B21]">
            VitrineHub ✅
          </h3>
        </div>
        <ul className="space-y-1.5">
          {vitrineHubPoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px] text-[#111B21] leading-[1.35]">
              <Check className="w-3.5 h-3.5 text-[#008069] shrink-0 mt-0.5 stroke-[2.5]" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white/95 border border-black/10 rounded-[10px] p-3 shadow-[0_1px_1.5px_rgba(11,20,26,0.06)]">
        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-100">
          <X className="w-4 h-4 text-[#667781] shrink-0" />
          <h3 className="text-[13px] font-bold text-[#54656F]">
            Plataformas de Delivery
          </h3>
        </div>
        <ul className="space-y-1.5">
          {marketplacePoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px] text-[#54656F] leading-[1.35]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696A0] shrink-0 mt-1.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const PlansWidget: React.FC<{
  settings: AppSettings;
  sessionId: string;
  onSelectPlan: (plan: PlanChoice) => void;
}> = ({ settings, sessionId, onSelectPlan }) => {
  const [nfcImgFailed, setNfcImgFailed] = useState(false);
  const [optName, setOptName] = useState('');
  const [optBusiness, setOptBusiness] = useState('');
  const [optCity, setOptCity] = useState('');
  const [optType, setOptType] = useState('');
  const [optPhone, setOptPhone] = useState('');
  const [optSaving, setOptSaving] = useState(false);
  const [optSaved, setOptSaved] = useState(false);

  const hasAnyOptField =
    optName.trim() ||
    optBusiness.trim() ||
    optCity.trim() ||
    optType.trim() ||
    optPhone.trim();

  const handleSaveOptionalLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyOptField || optSaving) return;
    setOptSaving(true);
    try {
      await submitLead({
        responsibleName: optName,
        businessName: optBusiness,
        city: optCity,
        businessType: optType,
        contactPhone: optPhone,
        selectedPlan: 'interest',
        selectedPlanLabel: 'Base Futura / Contato Opcional',
        visitorSessionId: sessionId,
      });
      setOptSaved(true);
    } finally {
      setOptSaving(false);
    }
  };

  return (
    <div className="space-y-2 max-w-[560px]">
      {/* Featured Primary Card: Pacote de Configuração Completa */}
      <div className="bg-white border-2 border-[#008069] rounded-[10px] overflow-hidden shadow-[0_4px_14px_rgba(0,128,105,0.12)]">
        <div className="bg-[#008069] text-white px-3.5 py-1.5 flex items-center justify-between gap-2 text-[11.5px] font-semibold">
          <span>⭐ Recomendado · Melhor custo-benefício</span>
          <span className="font-mono text-emerald-100 hidden sm:inline">2 meses Pro grátis</span>
        </div>

        <div className="p-3 sm:p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 pb-2.5 border-b border-neutral-100">
            <div>
              <h3 className="text-[15px] font-bold text-[#111B21] leading-snug">
                {settings.setupPlanName}
              </h3>
              <p className="text-[12px] text-[#54656F] mt-0.5 leading-[1.35]">
                {settings.setupPlanDescription}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#008069]">
                {settings.setupPlanPrice}
              </span>
              <span className="block text-[11px] font-medium text-[#006B58]">
                pagamento único · inclui 2 meses Pro
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-2.5">
            {settings.setupPlanBenefits.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 text-[12px] text-[#111B21] leading-[1.35]"
              >
                <Check className="w-3.5 h-3.5 text-[#008069] shrink-0 mt-0.5 stroke-[2.5]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-2.5 bg-[#F2FBF7] border border-emerald-200/80 rounded-[8px] p-2.5 text-[11.5px] text-[#0F2922] leading-[1.4]">
            <span className="font-semibold">Por que vale mais a pena:</span> você economiza horas de cadastro, começa com visual profissional validado, ganha 2 meses do Plano Pro e leva a plaquinha NFC + QR Code pronta para gerar pedidos no salão e no delivery.
          </div>

          <button
            type="button"
            onClick={() => onSelectPlan('setup')}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#008069] text-white text-[13.5px] font-semibold hover:bg-[#016B58] active:scale-[0.99] transition-all shadow-[0_2px_6px_rgba(0,128,105,0.2)] min-h-[44px]"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>{settings.setupPlanButtonText}</span>
          </button>
        </div>
      </div>

      {/* Plaquinha NFC + QR Code Sales Impact Showcase */}
      <div className="bg-white border border-black/10 rounded-[10px] overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-stretch shadow-[0_1px_1.5px_rgba(11,20,26,0.08)]">
        <div className="sm:col-span-5 bg-neutral-100">
          {!nfcImgFailed ? (
            <img
              src={NFC_PLAQUE_IMAGE_URL}
              alt="Plaquinha NFC e QR Code personalizado VitrineHub"
              referrerPolicy="no-referrer"
              onError={() => setNfcImgFailed(true)}
              className="w-full h-full min-h-[130px] max-h-[160px] sm:max-h-none object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[130px] bg-gradient-to-br from-[#075E54] to-[#008069] flex flex-col items-center justify-center text-white p-3">
              <Nfc className="w-6 h-6 mb-1 text-emerald-200" />
              <span className="text-[11px] font-medium text-emerald-100">
                Plaquinha NFC + QR Code
              </span>
            </div>
          )}
        </div>
        <div className="sm:col-span-7 p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[#111B21] font-bold text-[12.5px] mb-1">
            <QrCode className="w-4 h-4 text-[#008069] shrink-0" />
            <span>Como a Plaquinha NFC acelera suas vendas</span>
          </div>
          <p className="text-[11.5px] text-[#54656F] leading-[1.4]">
            {settings.setupPlanNfcNote}
          </p>
        </div>
      </div>

      {/* Secondary Self-Service Option: Plano Pro — Faça Você Mesmo */}
      <div className="bg-white/95 border border-black/10 rounded-[10px] p-3 sm:p-3.5 shadow-[0_1px_1.5px_rgba(11,20,26,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-neutral-100">
          <div>
            <p className="text-[11px] font-medium text-[#667781]">
              Opção Faça Você Mesmo (sem configuração inclusa)
            </p>
            <h3 className="text-[14px] font-bold text-[#111B21] mt-0.5 leading-snug">
              {settings.proPlanName}
            </h3>
          </div>
          <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-[#111B21] shrink-0">
            {settings.proPlanPrice}
          </span>
        </div>

        <p className="text-[12px] text-[#54656F] mt-2 leading-[1.35]">
          {settings.proPlanDescription}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-2">
          {settings.proPlanBenefits.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-1.5 text-[12px] text-[#54656F] leading-[1.35]"
            >
              <Check className="w-3.5 h-3.5 text-[#008069] shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSelectPlan('pro')}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-neutral-300 bg-neutral-50 text-[#111B21] text-xs font-semibold hover:bg-neutral-100 active:scale-[0.99] transition-all min-h-[44px]"
        >
          <span>{settings.proPlanButtonText}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      {/* Optional Future Client Database Card */}
      <div className="bg-white border border-black/10 rounded-[10px] p-3 sm:p-3.5 shadow-[0_1px_1.5px_rgba(11,20,26,0.06)]">
        {!optSaved ? (
          <form onSubmit={handleSaveOptionalLead} className="space-y-2">
            <div className="flex items-start gap-2">
              <BookmarkPlus className="w-4 h-4 text-[#008069] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-[#111B21] leading-snug">
                  Ainda avaliando? Deixe seu contato (opcional)
                </h4>
                <p className="text-[11.5px] text-[#667781] leading-[1.35] mt-0.5">
                  Preenchimento opcional para receber novidades ou condições comerciais da VitrineHub no futuro.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
              <input
                type="text"
                maxLength={140}
                value={optName}
                onChange={(e) => setOptName(e.target.value)}
                placeholder="Seu nome (opcional)"
                className="w-full px-3 py-2 rounded-[8px] border border-neutral-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#008069]/25 focus:border-[#008069]"
              />
              <input
                type="text"
                maxLength={140}
                value={optBusiness}
                onChange={(e) => setOptBusiness(e.target.value)}
                placeholder="Nome do estabelecimento (opcional)"
                className="w-full px-3 py-2 rounded-[8px] border border-neutral-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#008069]/25 focus:border-[#008069]"
              />
              <input
                type="text"
                maxLength={100}
                value={optCity}
                onChange={(e) => setOptCity(e.target.value)}
                placeholder="Cidade / Bairro (opcional)"
                className="w-full px-3 py-2 rounded-[8px] border border-neutral-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#008069]/25 focus:border-[#008069]"
              />
              <input
                type="text"
                maxLength={100}
                value={optType}
                onChange={(e) => setOptType(e.target.value)}
                placeholder="Segmento: hamburgueria, pizzaria... (opcional)"
                className="w-full px-3 py-2 rounded-[8px] border border-neutral-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#008069]/25 focus:border-[#008069]"
              />
              <input
                type="tel"
                maxLength={40}
                value={optPhone}
                onChange={(e) => setOptPhone(e.target.value)}
                placeholder="WhatsApp para contato futuro (opcional)"
                className="sm:col-span-2 w-full px-3 py-2 rounded-[8px] border border-neutral-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#008069]/25 focus:border-[#008069]"
              />
            </div>

            <div className="flex justify-end pt-0.5">
              <button
                type="submit"
                disabled={!hasAnyOptField || optSaving}
                className="px-4 py-2 rounded-[8px] bg-[#008069] text-white text-xs font-semibold hover:bg-[#016B58] disabled:opacity-45 transition-colors min-h-[40px]"
              >
                {optSaving ? 'Salvando...' : 'Salvar contato opcional'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[#0F2922]">
            <CheckCircle2 className="w-4 h-4 text-[#008069] shrink-0" />
            <span>
              <strong>Contato salvo com sucesso.</strong> Quando desejar ativar sua operação, basta escolher um dos planos acima.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
