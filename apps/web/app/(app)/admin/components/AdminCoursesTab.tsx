'use client';

import React, { useState } from 'react';
import { apiFetch, API_BASE } from '../../../lib/apiClient';
import { AdminCourseRow } from '../types';
import { formatDate, formatNumber, initialsOf } from '../utils';

// B40/A4 (Sprint 13) — Cursos REAIS do catálogo.
// Antes: cursos inventados com rating, dificuldade, status
// (published/draft/archived) e desafios fabricados com casos de teste,
// mais ações simuladas (publicar desafio, mudar status) gravadas em
// localStorage. Agora a lista vem de GET /courses (a mesma do aluno) e
// mostra só o que a API sustenta: título, slug, instrutor real,
// contagens reais de atividades e matrículas e se o curso está na
// biblioteca pública. O modelo de curso da API NÃO tem status nem
// rating: o toggle e os campos foram removidos. A criação de desafios
// pelo formulário simplificado também saiu — o contrato real de
// autoria de atividades (POST /activities) exige slug, código inicial
// e testes, e vive no fluxo do instrutor, não neste painel.

interface AdminCoursesTabProps {
  courses: AdminCourseRow[];
  coursesError: string | null;
  onRefresh: () => Promise<void>;
}

export const AdminCoursesTab: React.FC<AdminCoursesTabProps> = ({ courses, coursesError, onRefresh }) => {
  const [editing, setEditing] = useState<AdminCourseRow | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setEditing(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setFormError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const response = await apiFetch(
        `${API_BASE}/courses${editing ? `/${editing.id}` : ''}`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            editing ? { title, description } : { title, slug, description },
          ),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `HTTP ${response.status}`);
      }
      setNotice(editing ? 'Curso atualizado.' : 'Curso criado.');
      reset();
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao salvar o curso.');
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (course: AdminCourseRow) => {
    setEditing(course);
    setTitle(course.title);
    setSlug(course.slug);
    setDescription(course.description || '');
    setFormError(null);
    setNotice(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white font-heading">Cursos &amp; Atividades</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          {formatNumber(courses.length)} curso(s) reais retornados por GET /courses.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[#27272A] bg-[#121217] p-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3 md:col-span-2">
          <h3 className="text-sm font-semibold text-white">{editing ? `Editando: ${editing.title}` : 'Criar curso'}</h3>
          {editing && <button type="button" onClick={reset} className="text-xs text-zinc-400 hover:text-white">Cancelar edição</button>}
        </div>
        <label className="text-xs text-zinc-300">
          Título
          <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#27272A] bg-[#09090A] px-3 py-2 text-sm text-white" />
        </label>
        {!editing && (
          <label className="text-xs text-zinc-300">
            Slug
            <input required maxLength={100} pattern="[a-z0-9-]+" value={slug} onChange={(event) => setSlug(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#27272A] bg-[#09090A] px-3 py-2 font-mono text-sm text-white" />
          </label>
        )}
        <label className="text-xs text-zinc-300 md:col-span-2">
          Descrição
          <textarea maxLength={20000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#27272A] bg-[#09090A] px-3 py-2 text-sm text-white" />
        </label>
        {formError && <p role="alert" className="text-xs text-rose-300 md:col-span-2">{formError}</p>}
        {notice && <p role="status" className="text-xs text-emerald-300 md:col-span-2">{notice}</p>}
        <button type="submit" disabled={busy} className="rounded-lg bg-[#8257E5] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#996DFF] disabled:opacity-50 md:col-span-2">
          {busy ? 'Salvando...' : editing ? 'Salvar curso' : 'Criar curso'}
        </button>
      </form>

      {coursesError ? (
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] text-xs text-[#A1A1AA]">
          Não foi possível carregar os cursos reais: {coursesError}
        </div>
      ) : courses.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] text-xs text-[#A1A1AA]">
          Nenhum curso cadastrado na plataforma até o momento.
        </div>
      ) : (
        <div className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[820px]">
            <thead>
              <tr className="border-b border-[#27272A] text-[#71717A] font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Curso</th>
                <th className="py-3 px-4">Instrutor</th>
                <th className="py-3 px-4">Atividades</th>
                <th className="py-3 px-4">Matrículas</th>
                <th className="py-3 px-4">Biblioteca pública</th>
                <th className="py-3 px-4">Criado em</th>
                <th className="py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-b border-[#27272A]/50 hover:bg-[#181820]/60">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-white">{course.title}</p>
                    <p className="text-[11px] text-[#71717A] font-mono">/courses/{course.slug}</p>
                  </td>
                  <td className="py-3 px-4">
                    {course.instructor ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[#181820] border border-[#27272A] flex items-center justify-center font-mono font-black text-[10px] text-white shrink-0">
                          {initialsOf(course.instructor.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white truncate max-w-[180px]">
                            {course.instructor.name}
                          </p>
                          <p className="text-[10px] text-[#71717A] font-mono truncate max-w-[180px]">
                            {course.instructor.email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#71717A]">Não informado</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">
                    {course._count?.activities ?? 0}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">
                    {course._count?.enrollments ?? 0}
                  </td>
                  <td className="py-3 px-4 text-[#A1A1AA]">
                    {course.isPublicLibrary ? 'Sim' : 'Não'}
                  </td>
                  <td className="py-3 px-4 text-[#A1A1AA]">{formatDate(course.createdAt)}</td>
                  <td className="py-3 px-4">
                    <button type="button" onClick={() => beginEdit(course)} className="rounded-lg border border-[#3F3F46] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#996DFF]">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
        <span className="font-bold text-white">Limites do contrato atual:</span> cursos podem ser
        criados e ter título/descrição ajustados. O modelo não tem status ou rating, e a autoria de
        atividades usa o contrato completo de POST /activities no fluxo de instrutor.
      </div>
    </div>
  );
};
