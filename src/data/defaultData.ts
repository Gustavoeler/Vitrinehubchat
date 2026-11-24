import { AppSettings, FlowStep, MenuExample } from '../types/vitrinehub';

export const VITRINEHUB_AVATAR_URL = '/src/assets/images/vitrinehub_avatar_1795558358261.jpg';
export const NFC_PLAQUE_IMAGE_URL = '/src/assets/images/nfc_plaque_showcase_1795558361049.jpg';

export const PRESET_DEMO_IMAGES = [
  {
    label: 'Hamburgueria Artesanal',
    url: '/src/assets/images/demo_burger_menu_1795558358965.jpg',
  },
  {
    label: 'Pizzaria Napoletana',
    url: '/src/assets/images/demo_pizza_menu_1795558360132.jpg',
  },
  {
    label: 'Açaí & Sobremesas',
    url: '/src/assets/images/demo_acai_menu_1795558359916.jpg',
  },
  {
    label: 'Sushi & Culinária Japonesa',
    url: '/src/assets/images/demo_sushi_menu_1795558360188.jpg',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  brandName: 'VitrineHub | Atendimento Comercial',
  statusLabel: 'Online',
  whatsappNumber: '5511999999999',
  whatsappPrefillMessage:
    'Olá! Vim pelo atendimento da VitrineHub e tenho interesse no pacote de configuração completa de R$ 159,90.',
  proCheckoutUrl: 'https://vitrinehub.com.br/assinar-pro',
  proPlanName: 'Plano Pro — Faça Você Mesmo',
  proPlanPrice: 'R$ 29,90/mês',
  proPlanDescription:
    'Tenha seu próprio cardápio digital e gerencie seu estabelecimento de maneira independente.',
  proPlanBenefits: [
    'Acesso ao plano Pro.',
    'Criação e personalização do cardápio.',
    'Cadastro e edição de produtos.',
    'Pedidos organizados pelo WhatsApp.',
    'Sem comissão sobre vendas.',
  ],
  proPlanButtonText: 'Começar por R$ 29,90/mês',
  setupPlanName: 'Pacote de Configuração Completa',
  setupPlanPrice: 'R$ 159,90',
  setupPlanDescription:
    'Não quer perder tempo configurando tudo? Nós fazemos isso para você!',
  setupPlanBenefits: [
    'Configuração completa do estabelecimento.',
    'Cadastro e organização dos produtos.',
    'Personalização com a identidade visual da loja.',
    'Cardápio preparado para utilização.',
    'Conta configurada no nome do próprio cliente.',
    'Dois meses gratuitos do plano Pro.',
    'Uma plaquinha NFC personalizada.',
    'QR Code personalizado com a logo do estabelecimento.',
  ],
  setupPlanNfcNote:
    'A plaquinha NFC exclusiva transforma mesas e balcão em canais de venda automática: basta o cliente aproximar o celular (ou escanear o QR Code personalizado com sua logo) para abrir seu cardápio na hora, sem baixar app. Isso acelera os pedidos no salão, estimula combos e adicionais e fideliza o cliente para pedir direto pelo seu WhatsApp sem taxas. Importante: o pacote inclui apenas UMA plaquinha NFC (unidades extras podem ser solicitadas separadamente).',
  setupPlanButtonText: 'Quero o pacote completo de R$ 159,90',
};

export const DEFAULT_BENEFITS_LIST = [
  '📱 Cardápio digital exclusivo com a identidade da sua loja',
  '🖼️ Fotos, descrições, adicionais e preços bem organizados',
  '💬 Pedido chega pronto e detalhado direto no seu WhatsApp',
  '🔗 Acesso imediato por link na bio ou QR Code na mesa',
  '📈 Zero comissão sobre os pedidos — o lucro fica com você',
  '⚙️ Painel simples para atualizar preços e itens a qualquer hora',
];

export const DEFAULT_FLOW_STEPS: FlowStep[] = [
  {
    id: 'step_welcome',
    stepKey: 'welcome',
    order: 0,
    title: 'Boas-vindas',
    messages: [
      'Olá! Seja bem-vindo à *VitrineHub* 👋\n\nAjudamos restaurantes, lanchonetes e hamburguerias a *aumentarem a margem de lucro* com cardápio digital próprio — *sem pagar comissões por pedido*.',
      'Em menos de 1 minuto eu te mostro como funciona na prática. Podemos começar?',
    ],
    buttonText: 'Conhecer a VitrineHub',
    widgetType: 'none',
    isActive: true,
  },
  {
    id: 'step_problem',
    stepKey: 'problem',
    order: 1,
    title: 'O Problema',
    messages: [
      '⚠️ Antes de apresentar a plataforma, vale analisar um ponto financeiro importante.\n\nAs plataformas tradicionais de delivery chegam a cobrar cerca de *30% de comissão por pedido*, além de taxas operacionais conforme o plano.',
      'Veja um exemplo prático de como isso impacta o caixa: 📊\n\n• *Joãozinho vendeu 30 hambúrgueres e faturou R$ 250,00.*\n• Desses R$ 250,00, *R$ 120,00 foram para o delivery* em comissões e taxas.\n\n✅ *Com a VitrineHub*, esse custo mensal seria apenas de *R$ 29,90 por mês* — mantendo o restante do faturamento com o seu negócio.',
    ],
    buttonText: 'Quero conhecer a solução 💡',
    widgetType: 'none',
    isActive: true,
  },
  {
    id: 'step_solution',
    stepKey: 'solution',
    order: 2,
    title: 'A Solução VitrineHub',
    messages: [
      '💡 É exatamente para resolver esse gargalo que existe a *VitrineHub*.\n\nSua operação passa a contar com um *cardápio digital próprio*, personalizado com a marca, fotos e preços do seu estabelecimento.',
      'O cliente acessa pelo *link ou QR Code*, seleciona os itens e envia o *pedido organizado direto para o seu WhatsApp*. 📲\n\nTudo com *zero comissão sobre as vendas*:',
    ],
    buttonText: 'Ver modelos na prática',
    widgetType: 'benefits_list',
    isActive: true,
  },
  {
    id: 'step_demo',
    stepKey: 'demo',
    order: 3,
    title: 'Demonstração',
    messages: [
      '🍽️ Veja como fica a experiência de compra do seu cliente.\n\nConfira os modelos abaixo e toque em *Conhecer cardápio* para navegar em uma demonstração real:',
      'Seu estabelecimento também pode oferecer essa apresentação profissional — rápida, clara e estruturada para converter mais pedidos.',
    ],
    buttonText: 'Quero meu cardápio próprio',
    widgetType: 'menu_examples',
    isActive: true,
  },
  {
    id: 'step_differentials',
    stepKey: 'differentials',
    order: 4,
    title: 'Diferenciais',
    messages: [
      '📊 *Por que estruturar seu canal próprio na VitrineHub* em vez de depender exclusivamente dos aplicativos de delivery?',
      '✅ Porque você *não entrega parte do seu faturamento* a cada venda. O cliente compra direto com sua loja, sua margem permanece protegida e você constrói uma base própria de clientes.',
    ],
    buttonText: 'Ver planos disponíveis 💳',
    widgetType: 'comparison',
    isActive: true,
  },
  {
    id: 'step_plans',
    stepKey: 'plans',
    order: 5,
    title: 'Planos e Contratação',
    messages: [
      '💳 Agora que você já conhece o funcionamento, veja as duas formas de ativar sua operação na *VitrineHub*:',
      '⭐ *{{setupName}} ({{setupPrice}})* — A opção mais completa e recomendada. Nossa equipe configura todo o cardápio (fotos, descrições e identidade visual), você recebe *2 meses gratuitos do Plano Pro* e ganha *1 Plaquinha NFC + QR Code personalizado* para seus clientes aproximarem o celular na mesa ou balcão e pedirem na hora. Você poupa tempo e já inicia com foco total em conversão.',
      '⚙️ *{{proName}} ({{proPrice}})* — Indicado se você mesmo preferir cadastrar os produtos e gerenciar tudo de forma independente, com pedidos no WhatsApp e zero comissão.',
    ],
    buttonText: '',
    widgetType: 'plans',
    isActive: true,
  },
];

const LEGACY_STEP_SIGNATURES: Record<string, string[]> = {
  step_welcome: [
    'Somos uma plataforma criada para ajudar restaurantes',
    'Em menos de 1 minuto eu te mostro como isso aumenta o lucro',
  ],
  step_problem: [
    'Antes de te apresentar a plataforma, existe algo importante',
    'Imagine vender R$ 10.000 em pedidos',
    'Olha um exemplo real de como isso pesa no caixa',
  ],
  step_solution: [
    'É exatamente para resolver esse problema que existe a VitrineHub!',
    'É exatamente para você não perder dinheiro assim',
  ],
  step_demo: [
    'Olha só alguns exemplos de cardápios que já podem ser utilizados como referência',
    'Quer ver como fica para o seu cliente na prática?',
  ],
  step_differentials: [
    'Mas por que escolher a VitrineHub em vez de depender exclusivamente',
    'Por que ter seu próprio cardápio na VitrineHub',
  ],
  step_plans: [
    'Agora que você já viu como a VitrineHub funciona na prática',
    'Agora que você já viu tudo funcionando',
    'Se você prefere autonomia total',
    'Aqui na VitrineHub temos duas opções',
  ],
};

export function upgradeLegacySeededStep(step: FlowStep): { step: FlowStep; upgraded: boolean } {
  const signatures = LEGACY_STEP_SIGNATURES[step.id];
  if (!signatures) return { step, upgraded: false };

  const joined = (step.messages || []).join('\n');
  const isLegacyDefault = signatures.some((sig) => joined.includes(sig));
  if (!isLegacyDefault) return { step, upgraded: false };

  const replacement = DEFAULT_FLOW_STEPS.find((d) => d.id === step.id);
  if (!replacement) return { step, upgraded: false };

  return {
    step: {
      ...replacement,
      order: step.order,
      isActive: step.isActive,
    },
    upgraded: true,
  };
}

export const DEFAULT_MENU_EXAMPLES: MenuExample[] = [
  {
    id: 'demo_burger',
    businessName: 'Stackhouse Smash Burger',
    category: 'Hamburgueria Artesanal',
    imageUrl: '/src/assets/images/demo_burger_menu_1795558358965.jpg',
    demoUrl: '/demo/stackhouse-burger',
    description: 'Cardápio com combos personalizáveis, adicionais e pedido direto no WhatsApp.',
    order: 0,
    isActive: true,
  },
  {
    id: 'demo_pizza',
    businessName: 'Forno Napoli Pizzaria',
    category: 'Pizzaria & Massas',
    imageUrl: '/src/assets/images/demo_pizza_menu_1795558360132.jpg',
    demoUrl: '/demo/forno-napoli',
    description: 'Escolha de sabores meio a meio, bordas recheadas e cálculo rápido de entrega.',
    order: 1,
    isActive: true,
  },
  {
    id: 'demo_acai',
    businessName: 'Açaí Blooms Café',
    category: 'Açaiteria & Sobremesas',
    imageUrl: '/src/assets/images/demo_acai_menu_1795558359916.jpg',
    demoUrl: '/demo/acai-blooms',
    description: 'Monte seu açaí com seleção guiada de tamanhos, cremes e acompanhamentos.',
    order: 2,
    isActive: true,
  },
  {
    id: 'demo_sushi',
    businessName: 'Sushi Yume Lounge',
    category: 'Culinária Japonesa',
    imageUrl: '/src/assets/images/demo_sushi_menu_1795558360188.jpg',
    demoUrl: '/demo/sushi-yume',
    description: 'Experiência visual refinada para combinados, temakis e pedidos para viagem.',
    order: 3,
    isActive: true,
  },
];

export function sanitizeExternalUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '#';
  } catch {
    return '#';
  }
}

export function buildWhatsAppUrl(rawNumber: string, message: string): string {
  const digits = (rawNumber || '').replace(/\D/g, '') || '5511999999999';
  const encoded = encodeURIComponent(message || DEFAULT_SETTINGS.whatsappPrefillMessage);
  return `https://wa.me/${digits}?text=${encoded}`;
}
