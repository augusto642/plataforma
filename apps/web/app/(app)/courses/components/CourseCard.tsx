import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { CatalogCourse } from '../../../lib/catalog';
import { courseLanguage, languageLabel } from '../../../lib/catalog';
import { courseCover } from '../../../lib/course-covers';
import type { CourseProgressEntry } from '../types';
import { courseProgressStatus } from '../utils';
import { MaterialIcon } from '../../../components/MaterialIcon';

interface CourseCardProps {
  course: CatalogCourse;
  progress?: CourseProgressEntry;
}

// Central 216 (F2/F4) — card no visual do protótipo Stitch v2
// (catalogo-cursos-mobile.html): capa local (nunca lh3), selo da
// linguagem, selo "No browser", título, descrição e "Acessar curso"
// → rota real /courses/[slug]. Sem instrutor/matriculados: o
// catálogo público não entrega esses campos (B41 — nada inventado).
// O progresso só aparece com matrícula real do usuário logado.
const LANGUAGE_BADGE: Record<string, string> = {
  javascript: 'bg-yellow-400/90 text-black',
  typescript: 'bg-[#3178C6]/90 text-white',
  python: 'bg-[#3776AB]/90 text-white',
  java: 'bg-[#F89820]/90 text-black',
  node: 'bg-[#3C873A]/90 text-white',
  nodejs: 'bg-[#3C873A]/90 text-white',
  portugol: 'bg-[#8257E5]/90 text-white',
};

export function CourseCard({ course, progress }: CourseCardProps) {
  const language = courseLanguage(course);
  const label = languageLabel(language);
  const cover = courseCover(language);
  const statusInfo = courseProgressStatus(progress);
  const statusClassName =
    statusInfo.kind === 'completed'
      ? 'text-[#04D361] font-semibold'
      : statusInfo.kind === 'in-progress'
        ? 'text-[#00E5FF] font-semibold'
        : 'text-zinc-500';

  return (
    <article className="bg-dark-surface-container-low border border-border-strong rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_12px_30px_-10px_rgba(130,87,229,0.3)] group">
      <div className="relative h-32 w-full bg-dark-surface">
        {cover ? (
          <Image
            src={cover}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-surface-container-low via-transparent to-transparent" />
        <span
          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded font-code text-[10px] font-bold ${
            (language && LANGUAGE_BADGE[language.toLowerCase()]) ??
            'bg-dark-surface-container text-white'
          }`}
        >
          {label}
        </span>
      </div>

      <div className="p-4 space-y-3 flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-code text-secondary flex items-center gap-1">
            <MaterialIcon name="terminal" className="text-[13px]" />
            No browser
          </span>
          {progress ? (
            <span className={`text-[11px] font-mono ${statusClassName}`}>
              {statusInfo.label}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="font-headline font-bold text-base text-white">{course.title}</h3>
          {course.description ? (
            <p className="text-[13px] text-zinc-400 leading-relaxed mt-1">
              {course.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-1 mt-auto">
          <span className="text-[11px] font-mono text-zinc-500">
            {course.activityCount}{' '}
            {course.activityCount === 1 ? 'atividade' : 'atividades'}
          </span>
          <Link
            href={`/courses/${course.slug}`}
            className="bg-[#27272A] hover:bg-[#8257E5] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-200 inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <span>Acessar curso</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
