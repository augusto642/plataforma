'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

interface ModelConfiguration {
  provider: string | null;
  activeModel: string | null;
  enabled: boolean;
  allowedModels: string[];
}

interface ActivityOption {
  id: string;
  title: string;
  course: { id: string; title: string };
}

interface AiRoom {
  id: string;
  activityId: string;
  title: string;
  slug: string;
  description: string;
  systemInstructions: string;
  model: string;
  isPublished: boolean;
  modelAllowed: boolean;
  activity: {
    id: string;
    title: string;
    course: { id: string; title: string };
  };
}

interface RoomForm {
  activityId: string;
  title: string;
  slug: string;
  description: string;
  systemInstructions: string;
  model: string;
  isPublished: boolean;
}

const emptyForm: RoomForm = {
  activityId: '',
  title: '',
  slug: '',
  description: '',
  systemInstructions: '',
  model: '',
  isPublished: false,
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const AdminAiRoomsTab: React.FC = () => {
  const [rooms, setRooms] = useState<AiRoom[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [configuration, setConfiguration] = useState<ModelConfiguration | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomData, activityData, modelData] = await Promise.all([
        apiFetch(`${API_BASE}/admin/ai/rooms`).then(readJson<AiRoom[]>),
        apiFetch(`${API_BASE}/admin/ai/rooms/activities`).then(readJson<ActivityOption[]>),
        apiFetch(`${API_BASE}/admin/ai/model-configuration`).then(readJson<ModelConfiguration>),
      ]);
      setRooms(roomData);
      setActivities(activityData);
      setConfiguration(modelData);
      setForm((current) => ({
        ...current,
        activityId: current.activityId || activityData[0]?.id || '',
        model: current.model || modelData.activeModel || modelData.allowedModels[0] || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar salas e modelos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const beginEdit = (room: AiRoom) => {
    setEditingId(room.id);
    setNotice(null);
    setForm({
      activityId: room.activityId,
      title: room.title,
      slug: room.slug,
      description: room.description,
      systemInstructions: room.systemInstructions,
      model: room.model,
      isPublished: room.isPublished,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      activityId: activities[0]?.id || '',
      model: configuration?.activeModel || configuration?.allowedModels[0] || '',
    });
    setNotice(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = editingId
        ? {
            title: form.title,
            slug: form.slug,
            description: form.description,
            systemInstructions: form.systemInstructions,
            model: form.model,
            isPublished: form.isPublished,
          }
        : form;
      const response = await apiFetch(
        `${API_BASE}/admin/ai/rooms${editingId ? `/${editingId}` : ''}`,
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      await readJson(response);
      setNotice(editingId ? 'Sala especializada atualizada.' : 'Sala especializada criada.');
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar a sala.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[#27272A] bg-[#09090A] px-3 py-2 text-sm text-white outline-none focus:border-[#8257E5]';
  const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-300';

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-[#996DFF]">IA & conteúdo</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Salas especializadas</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Configure tutores por atividade, com instruções pedagógicas próprias e modelos limitados
          à allowlist do servidor. Chaves e credenciais nunca são exibidas aqui.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#27272A] bg-[#121217] p-4">
          <div className="text-xs text-zinc-500">Provedor ativo</div>
          <div className="mt-1 font-semibold text-white">{configuration?.provider || 'Não configurado'}</div>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#121217] p-4">
          <div className="text-xs text-zinc-500">Modelo padrão</div>
          <div className="mt-1 font-mono text-sm text-white">{configuration?.activeModel || 'Não configurado'}</div>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#121217] p-4">
          <div className="text-xs text-zinc-500">Allowlist do servidor</div>
          <div className="mt-1 font-semibold text-white">
            {configuration?.allowedModels.length ?? 0} modelo(s)
            <span className={`ml-2 text-xs ${configuration?.enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
              {configuration?.enabled ? 'IA disponível' : 'IA indisponível'}
            </span>
          </div>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-xl border border-[#27272A] bg-[#121217] p-4">
          <h2 className="mb-4 text-sm font-semibold text-white">Salas cadastradas</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Carregando dados reais...</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma sala especializada cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <article key={room.id} className="rounded-lg border border-[#27272A] bg-[#09090A] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white">{room.title}</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {room.activity.course.title} / {room.activity.title}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">{room.description}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${room.isPublished ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-700/40 text-zinc-300'}`}>
                      {room.isPublished ? 'Publicada' : 'Rascunho'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#27272A] pt-3">
                    <span className={`font-mono text-xs ${room.modelAllowed ? 'text-zinc-400' : 'text-amber-300'}`}>
                      {room.model}{room.modelAllowed ? '' : ' · não liberado'}
                    </span>
                    <button
                      type="button"
                      onClick={() => beginEdit(room)}
                      className="rounded-lg border border-[#3F3F46] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#996DFF]"
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={save} className="space-y-4 rounded-xl border border-[#27272A] bg-[#121217] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">{editingId ? 'Editar sala' : 'Criar sala'}</h2>
            {editingId && <button type="button" onClick={resetForm} className="text-xs text-zinc-400 hover:text-white">Cancelar edição</button>}
          </div>
          {!editingId && (
            <label className="block">
              <span className={labelClass}>Atividade vinculada</span>
              <select required value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })} className={inputClass}>
                <option value="">Selecione uma atividade</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>{activity.course.title} / {activity.title}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className={labelClass}>Nome</span>
            <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Slug (minúsculas, números e hífens)</span>
            <input required maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Descrição para o aluno</span>
            <textarea required maxLength={500} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Instruções pedagógicas do tutor</span>
            <textarea required minLength={10} maxLength={8000} rows={6} value={form.systemInstructions} onChange={(e) => setForm({ ...form, systemInstructions: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Modelo permitido</span>
            <select required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputClass}>
              <option value="">Selecione um modelo liberado</option>
              {editingId && form.model && !configuration?.allowedModels.includes(form.model) && (
                <option value={form.model}>{form.model} · não liberado (publique outro modelo)</option>
              )}
              {configuration?.allowedModels.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Publicar para alunos desta atividade
          </label>
          {configuration && configuration.allowedModels.length === 0 && (
            <p className="text-xs text-amber-300">Nenhum modelo liberado. Configure AI_ALLOWED_MODELS no servidor antes de criar salas.</p>
          )}
          <button
            type="submit"
            disabled={saving || loading || !form.model || (!editingId && !form.activityId)}
            className="w-full rounded-lg bg-[#8257E5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#996DFF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar sala'}
          </button>
        </form>
      </div>
    </section>
  );
};
