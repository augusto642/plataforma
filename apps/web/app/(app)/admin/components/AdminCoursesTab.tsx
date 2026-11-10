'use client';

import React from 'react';
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
}

export const AdminCoursesTab: React.FC<AdminCoursesTabProps> = ({ courses, coursesError }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white font-heading">Cursos &amp; Atividades</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          {formatNumber(courses.length)} curso(s) reais retornados por GET /courses.
        </p>
      </div>

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
        <span className="font-bold text-white">Ações não oferecidas:</span> o modelo de curso da
        API não tem campo de status (publicado/rascunho/arquivado) nem rating — os controles e
        números fictícios foram removidos. A autoria de atividades usa o contrato completo de
        POST /activities no fluxo do instrutor; o formulário simplificado de “novo desafio” deste
        painel não correspondia a esse contrato e foi retirado.
      </div>
    </div>
  );
};
