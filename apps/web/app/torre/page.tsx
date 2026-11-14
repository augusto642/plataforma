'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../lib/apiClient';
import { Tower3DScene } from './components/Tower3DScene';
import { TowerMerchantModal, type TowerItemView, type InventoryItemView, type ActiveEffectView } from './components/TowerMerchantModal';
import { TowerChallengeModal } from './components/TowerChallengeModal';

interface TowerProgress {
  floor: number;
  square: number;
  movesLeftToday: number;
  dailyMovesLimit: number;
  plan: string;
  maxFloor: number;
  pendingChallenge: {
    activityId: string;
    floor: number;
    toSquare: number;
    squareType: string;
    timeLimitSeconds: number;
    deadlineAt: string;
  } | null;
}

export default function TorrePage() {
  const [progress, setProgress] = useState<TowerProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [isMerchantOpen, setIsMerchantOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [shopItems, setShopItems] = useState<TowerItemView[]>([]);
  const [inventory, setInventory] = useState<InventoryItemView[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffectView[]>([]);

  const loadData = async () => {
    try {
      const [progRes, invRes, shopRes] = await Promise.all([
        apiClient.get('/tower/progress'),
        apiClient.get('/tower/inventory'),
        apiClient.get('/tower/merchant'),
      ]);

      if (progRes.ok) {
        const progData = await progRes.json();
        setProgress(progData);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setCoins(invData.coins || 0);
        setInventory(invData.inventory || []);
        setActiveEffects(invData.activeEffects || []);
      }

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShopItems(shopData);
      }
    } catch (err) {
      setError('Falha ao sincronizar com a Torre.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRollDice = async () => {
    if (!progress || progress.movesLeftToday <= 0 || rolling) return;
    setRolling(true);
    setError(null);
    try {
      const res = await apiClient.post('/tower/roll');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Falha ao rolar o dado');
      }
      const data = await res.json();
      setLastRoll(data.roll);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRolling(false);
    }
  };

  const handleBuyItem = async (itemCode: string) => {
    const res = await apiClient.post('/tower/merchant/buy', { itemCode });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Falha ao comprar item');
    }
    await loadData();
  };

  const handleUseItem = async (itemCode: string) => {
    const res = await apiClient.post('/tower/inventory/use', { itemCode });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Falha ao ativar item');
    }
    await loadData();
  };

  const handleAskOracle = async (): Promise<string> => {
    const res = await apiClient.post('/tower/oracle-hint');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Falha ao consultar Oráculo');
    }
    const data = await res.json();
    await loadData();
    return data.hint;
  };

  const handleSubmitChallenge = async (code: string) => {
    const res = await apiClient.post('/tower/submit', { code });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Erro ao submeter resposta');
    }
    await loadData();
  };

  const hasShield = activeEffects.some((eff) => eff.effectType === 'SHIELD' && eff.charges > 0);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Superior */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0C0F17] border border-slate-800 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
              <span>🗼</span>
              <span>Torre dos Desafios 3D · Modo Roguelike</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Andar {progress?.floor || 1} · {progress?.square || 0} / 30 Casas
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Role o dado diário para ascender. Erros ativam a penalidade de recuo (Origem - 1).
            </p>
          </div>

          {/* HUD de Recursos */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Moedas */}
            <div className="px-4 py-2.5 rounded-xl bg-[#121624] border border-slate-700/80 flex items-center gap-2">
              <span className="text-base">🪙</span>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Moedas</div>
                <div className="text-sm font-extrabold text-amber-400 font-mono">{coins}</div>
              </div>
            </div>

            {/* Jogadas Diárias */}
            <div className="px-4 py-2.5 rounded-xl bg-[#121624] border border-slate-700/80 flex items-center gap-2">
              <span className="text-base">🎲</span>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Jogadas Hoje</div>
                <div className="text-sm font-extrabold text-indigo-400 font-mono">
                  {progress?.movesLeftToday ?? 0} / {progress?.dailyMovesLimit ?? 3}
                </div>
              </div>
            </div>

            {/* Botão Mercador */}
            <button
              onClick={() => setIsMerchantOpen(true)}
              className="px-4 py-3 rounded-xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 text-xs font-bold transition-all flex items-center gap-2"
            >
              <span>🧙‍♂️</span>
              <span>Mercador & Inventário</span>
            </button>
          </div>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tabuleiro 3D com Three.js */}
        <div className="relative">
          <Tower3DScene
            floor={progress?.floor || 1}
            currentSquare={progress?.square || 0}
            totalSquares={30}
          />

          {/* Painel Flutuante de Ação (Rolar Dado) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
            {lastRoll && (
              <div className="px-4 py-1.5 rounded-full bg-indigo-500 text-white font-mono text-xs font-black shadow-lg animate-bounce">
                🎲 Você rolou {lastRoll}!
              </div>
            )}

            <button
              type="button"
              disabled={rolling || (progress?.movesLeftToday ?? 0) <= 0 || !!progress?.pendingChallenge}
              onClick={handleRollDice}
              className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-2xl flex items-center gap-3 ${
                progress?.pendingChallenge
                  ? 'bg-amber-600 text-white animate-pulse'
                  : (progress?.movesLeftToday ?? 0) > 0
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/30 scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="text-xl">🎲</span>
              <span>
                {rolling
                  ? 'Rolando dados...'
                  : progress?.pendingChallenge
                  ? 'Desafio Pendente!'
                  : (progress?.movesLeftToday ?? 0) > 0
                  ? 'Rolar Dado da Torre'
                  : 'Jogadas Esgotadas Hoje'}
              </span>
            </button>
          </div>
        </div>

        {/* Modal de Desafio Cronometrado */}
        {progress?.pendingChallenge && (
          <TowerChallengeModal
            challenge={progress.pendingChallenge}
            hasShield={hasShield}
            onSubmit={handleSubmitChallenge}
            onAskOracle={handleAskOracle}
          />
        )}

        {/* Modal do Mercador & Inventário */}
        <TowerMerchantModal
          isOpen={isMerchantOpen}
          onClose={() => setIsMerchantOpen(false)}
          coins={coins}
          items={shopItems}
          inventory={inventory}
          activeEffects={activeEffects}
          onBuyItem={handleBuyItem}
          onUseItem={handleUseItem}
        />
      </div>
    </div>
  );
}
