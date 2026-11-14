'use client';

import React, { useState } from 'react';

export interface TowerItemView {
  code: string;
  name: string;
  description: string;
  costCoins: number;
  icon?: string;
}

export interface InventoryItemView {
  itemCode: string;
  name: string;
  description: string;
  icon?: string;
  quantity: number;
}

export interface ActiveEffectView {
  effectType: string;
  charges: number;
  expiresAt?: string;
}

interface TowerMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  items: TowerItemView[];
  inventory: InventoryItemView[];
  activeEffects: ActiveEffectView[];
  onBuyItem: (itemCode: string) => Promise<void>;
  onUseItem: (itemCode: string) => Promise<void>;
}

export const TowerMerchantModal: React.FC<TowerMerchantModalProps> = ({
  isOpen,
  onClose,
  coins,
  items,
  inventory,
  activeEffects,
  onBuyItem,
  onUseItem,
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = async (code: string) => {
    setBusyCode(code);
    setMessage(null);
    try {
      await onBuyItem(code);
      setMessage(`Item adquirido com sucesso!`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusyCode(null);
    }
  };

  const handleUse = async (code: string) => {
    setBusyCode(code);
    setMessage(null);
    try {
      await onUseItem(code);
      setMessage(`Efeito ativado com sucesso!`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0C0F17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#121624]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧙‍♂️</span>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                Mercador & Relíquias da Torre
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">Seu Saldo:</span>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  🪙 {coins} Nexus Coins
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Efeitos Ativos Banner */}
        {activeEffects.length > 0 && (
          <div className="px-5 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-3 overflow-x-auto text-xs">
            <span className="font-bold text-indigo-400 flex items-center gap-1">
              <span>⚡</span> Efeitos Ativos:
            </span>
            {activeEffects.map((eff, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-200 border border-indigo-500/30 font-mono"
              >
                {eff.effectType} ({eff.charges}x)
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-[#07090E]">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'shop'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Loja do Mercador
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'inventory'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Meu Inventário ({inventory.reduce((acc, it) => acc + it.quantity, 0)})
          </button>
        </div>

        {/* Feedback message */}
        {message && (
          <div className="px-5 py-2 text-xs bg-slate-800/80 text-amber-300 border-b border-slate-700">
            {message}
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'shop' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((it) => {
                const canAfford = coins >= it.costCoins;
                const isBuying = busyCode === it.code;
                return (
                  <div
                    key={it.code}
                    className="p-4 rounded-xl bg-[#07090E] border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{it.icon || '📦'}</span>
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          🪙 {it.costCoins}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm">{it.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {it.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford || isBuying}
                      onClick={() => handleBuy(it.code)}
                      className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isBuying ? 'Comprando...' : canAfford ? 'Comprar Item' : 'Moedas Insuficientes'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {inventory.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Seu inventário está vazio. Visite a Loja para adquirir itens de suporte.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inventory.map((inv) => {
                    const isUsing = busyCode === inv.itemCode;
                    return (
                      <div
                        key={inv.itemCode}
                        className="p-4 rounded-xl bg-[#07090E] border border-slate-800 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xl">{inv.icon || '🎒'}</span>
                            <span className="text-xs font-bold text-indigo-400 font-mono">
                              Qtd: {inv.quantity}x
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-sm">{inv.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{inv.description}</p>
                        </div>

                        <button
                          type="button"
                          disabled={isUsing}
                          onClick={() => handleUse(inv.itemCode)}
                          className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20"
                        >
                          {isUsing ? 'Ativando...' : 'Usar Item'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
