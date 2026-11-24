import React, { useMemo, useState } from 'react';
import { Check, MessageCircle, Minus, Plus, ShoppingBag, Sparkles, Store } from 'lucide-react';
import {
  DEFAULT_MENU_EXAMPLES,
  PRESET_DEMO_IMAGES,
} from '../data/defaultData';

interface DemoItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface DemoCatalog {
  slug: string;
  businessName: string;
  category: string;
  heroImage: string;
  accentBg: string;
  accentText: string;
  deliveryTime: string;
  items: DemoItem[];
}

const DEMO_CATALOGS: Record<string, DemoCatalog> = {
  'stackhouse-burger': {
    slug: 'stackhouse-burger',
    businessName: 'Stackhouse Smash Burger',
    category: 'Hamburgueria Artesanal',
    heroImage: PRESET_DEMO_IMAGES[0].url,
    accentBg: 'bg-emerald-700',
    accentText: 'text-emerald-700',
    deliveryTime: '30–40 min',
    items: [
      {
        id: 'b1',
        name: 'Classic Duplo Smash',
        description: 'Dois blends de 100g prensados na chapa, cheddar inglês derretido e cebola caramelizada no pão brioche.',
        price: 32.9,
        category: 'Burgers',
      },
      {
        id: 'b2',
        name: 'Combo Stackhouse + Fritas',
        description: 'Classic Duplo Smash acompanhado de batata rústica temperada com páprica e maionese da casa.',
        price: 44.9,
        category: 'Combos',
      },
      {
        id: 'b3',
        name: 'Batata Trufada',
        description: 'Porção individual crocante finalizada com azeite trufado e parmesão ralado na hora.',
        price: 19.9,
        category: 'Acompanhamentos',
      },
      {
        id: 'b4',
        name: 'Refrigerante Lata 350ml',
        description: 'Coca-Cola, Coca Zero ou Guaraná Antarctica bem gelado.',
        price: 7.0,
        category: 'Bebidas',
      },
    ],
  },
  'forno-napoli': {
    slug: 'forno-napoli',
    businessName: 'Forno Napoli Pizzaria',
    category: 'Pizzaria & Massas',
    heroImage: PRESET_DEMO_IMAGES[1].url,
    accentBg: 'bg-emerald-700',
    accentText: 'text-emerald-700',
    deliveryTime: '35–50 min',
    items: [
      {
        id: 'p1',
        name: 'Margherita Napoletana',
        description: 'Massa de fermentação natural 48h, molho de tomate pelati italiano, mozzarella fior di latte e manjericão.',
        price: 58.0,
        category: 'Pizzas Tradicionais',
      },
      {
        id: 'p2',
        name: 'Calabresa Artesanal',
        description: 'Calabresa defumada fatiada fina, cebola roxa marinada, orégano fresco e azeitonas pretas.',
        price: 62.0,
        category: 'Pizzas Tradicionais',
      },
      {
        id: 'p3',
        name: 'Diavola Picante',
        description: 'Salame italiano levemente picante, fior di latte e fio de mel silvestre.',
        price: 66.0,
        category: 'Especiais',
      },
      {
        id: 'p4',
        name: 'Tiramisù da Casa',
        description: 'Clássica sobremesa italiana com biscoito savoiardi, café espresso e creme mascarpone.',
        price: 24.0,
        category: 'Sobremesas',
      },
    ],
  },
  'acai-blooms': {
    slug: 'acai-blooms',
    businessName: 'Açaí Blooms Café',
    category: 'Açaiteria & Sobremesas',
    heroImage: PRESET_DEMO_IMAGES[2].url,
    accentBg: 'bg-emerald-700',
    accentText: 'text-emerald-700',
    deliveryTime: '20–30 min',
    items: [
      {
        id: 'a1',
        name: 'Bowl Tropical 500ml',
        description: 'Açaí puro batido na hora com morango fresco, banana fatiada, granola crocante e mel.',
        price: 26.9,
        category: 'Bowls Prontos',
      },
      {
        id: 'a2',
        name: 'Bowl Ninho & Nutella 400ml',
        description: 'Açaí cremoso em camadas com leite em pó integral, creme de avelã e morangos.',
        price: 29.9,
        category: 'Bowls Prontos',
      },
      {
        id: 'a3',
        name: 'Monte seu Açaí 700ml',
        description: 'Inclui até 4 acompanhamentos gratuitos à sua escolha e 1 cobertura especial.',
        price: 36.0,
        category: 'Personalize',
      },
      {
        id: 'a4',
        name: 'Smoothie Berry Proteico',
        description: 'Mix gelado de açaí, frutas vermelhas, iogurte natural e chia.',
        price: 18.5,
        category: 'Bebidas',
      },
    ],
  },
  'sushi-yume': {
    slug: 'sushi-yume',
    businessName: 'Sushi Yume Lounge',
    category: 'Culinária Japonesa',
    heroImage: PRESET_DEMO_IMAGES[3].url,
    accentBg: 'bg-emerald-700',
    accentText: 'text-emerald-700',
    deliveryTime: '40–55 min',
    items: [
      {
        id: 's1',
        name: 'Combinado Salmão 24 Peças',
        description: '8 sashimis de salmão fresco, 6 niguiris, 6 uramakis philadelphia e 4 hossomakis.',
        price: 89.0,
        category: 'Combinados',
      },
      {
        id: 's2',
        name: 'Hot Roll Crocante (10 un)',
        description: 'Empanado na farinha panko com salmão grelhado, cream cheese e molho tarê artesanal.',
        price: 36.0,
        category: 'Entradas Quentes',
      },
      {
        id: 's3',
        name: 'Temaki Salmão Completo',
        description: 'Cone de alga nori crocante recheado com salmão fresco em cubos, cream cheese e cebolinha.',
        price: 32.0,
        category: 'Temakis',
      },
      {
        id: 's4',
        name: 'Guioza Suíno (6 un)',
        description: 'Trouxinhas orientais seladas na chapa acompanhadas de molho ponzu.',
        price: 28.0,
        category: 'Entradas Quentes',
      },
    ],
  },
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const DemoMenuPreview: React.FC<{ slug: string }> = ({ slug }) => {
  const catalog = useMemo(() => {
    return DEMO_CATALOGS[slug] || DEMO_CATALOGS['stackhouse-burger'];
  }, [slug]);

  const categories = useMemo(
    () => Array.from(new Set(catalog.items.map((item) => item.category))),
    [catalog]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderSent, setOrderSent] = useState(false);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'Todos') return catalog.items;
    return catalog.items.filter((i) => i.category === selectedCategory);
  }, [catalog.items, selectedCategory]);

  const cartEntries = useMemo(() => {
    return catalog.items
      .filter((item) => (cart[item.id] || 0) > 0)
      .map((item) => ({ item, qty: cart[item.id] }));
  }, [catalog.items, cart]);

  const totalAmount = useMemo(() => {
    return cartEntries.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
  }, [cartEntries]);

  const totalCount = useMemo(() => {
    return cartEntries.reduce((sum, entry) => sum + entry.qty, 0);
  }, [cartEntries]);

  const updateQty = (id: string, delta: number) => {
    setOrderSent(false);
    setCart((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const whatsappPreviewText = useMemo(() => {
    const lines = cartEntries.map(
      (e) => `• ${e.qty}x ${e.item.name} — ${formatBRL(e.item.price * e.qty)}`
    );
    return `Olá! Gostaria de fazer um pedido em *${catalog.businessName}*:\n\n${lines.join('\n')}\n\n*Total estimado:* ${formatBRL(totalAmount)}`;
  }, [cartEntries, catalog.businessName, totalAmount]);

  const fallbackMeta = DEFAULT_MENU_EXAMPLES.find((e) => e.demoUrl.endsWith(slug));

  return (
    <div className="min-h-screen bg-[#F5F7F6] text-neutral-900 pb-28">
      <div className="bg-[#0F2922] text-white py-2.5 px-4 text-center text-xs sm:text-sm font-medium">
        Cardápio demonstrativo VitrineHub · Experiência interativa do cliente final (pedidos sem comissão)
      </div>

      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <img
              src={catalog.heroImage}
              alt={catalog.businessName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shrink-0"
            />
            <div>
              <p className="text-xs text-neutral-500 font-medium">
                {catalog.category} · Entrega {catalog.deliveryTime}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                {catalog.businessName}
              </h1>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                {fallbackMeta?.description || 'Pedidos enviados direto no WhatsApp da loja'}
              </p>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors self-start sm:self-center whitespace-nowrap shrink-0"
          >
            <Store className="w-4 h-4 text-emerald-700" />
            Voltar para VitrineHub
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          <button
            type="button"
            onClick={() => setSelectedCategory('Todos')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'Todos'
                ? 'bg-[#0F2922] text-white'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Todos os itens
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#0F2922] text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500">
                        {item.category}
                      </span>
                      <h2 className="text-base font-bold text-neutral-900 mt-0.5">
                        {item.name}
                      </h2>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-semibold text-emerald-800 whitespace-nowrap">
                      {formatBRL(item.price)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D8A56] text-white text-xs font-semibold hover:bg-[#0A7045] transition-colors min-h-[40px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-3 bg-neutral-100 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono tabular-nums text-sm font-bold text-neutral-900 w-5 text-center">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-[#0D8A56] text-white flex items-center justify-center hover:bg-[#0A7045]"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {orderSent && cartEntries.length > 0 && (
          <div className="mt-6 bg-white border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-2">
              <Check className="w-4 h-4" />
              Pré-visualização da mensagem enviada para o WhatsApp do estabelecimento
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              {whatsappPreviewText}
            </pre>
          </div>
        )}
      </main>

      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">
                  {totalCount} {totalCount === 1 ? 'item selecionado' : 'itens selecionados'}
                </p>
                <p className="font-mono tabular-nums text-base font-bold text-neutral-900">
                  {formatBRL(totalAmount)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOrderSent(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0D8A56] text-white text-sm font-semibold hover:bg-[#0A7045] transition-colors min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              Simular envio no WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
