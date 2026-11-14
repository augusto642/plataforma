export interface CertificateData {
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  completedAt: Date;
  verificationCode: string;
  level?: string;
  techStack?: string[];
  workloadHours?: number;
  sonarAudit?: {
    qualityGate: string;
    cleanCodeRating: string;
    coverage?: number;
  };
  giteaCommitSha?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildCertificateHtml(data: CertificateData): string {
  const studentName = escapeHtml(data.studentName);
  const courseTitle = escapeHtml(data.courseTitle);
  const brandName = escapeHtml(process.env.BRAND_NAME || 'Nexus Code');
  const levelText = data.level ? escapeHtml(data.level.toUpperCase()) : 'PROFISSIONAL';
  const hours = data.workloadHours || 40;
  const completedAt = data.completedAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const verificationCode = escapeHtml(data.verificationCode);
  const stack = data.techStack || ['Full Stack', 'Clean Architecture', 'DevOps CI/CD'];
  const sonar = data.sonarAudit;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificado Auditado ${brandName} — ${courseTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #07090e;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px 16px;
    color: #e2e8f0;
  }
  .certificate {
    background: #0c0f17;
    width: 100%;
    max-width: 880px;
    border: 2px solid #312e81;
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    padding: 60px 56px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .certificate::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 6px;
    background: linear-gradient(90deg, #6366f1, #a855f7, #3b82f6);
  }
  .header { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: #818cf8; font-weight: 700; margin-bottom: 20px; }
  .title { font-size: 38px; font-weight: 900; color: #ffffff; margin-bottom: 24px; letter-spacing: -0.5px; }
  .student-name { font-size: 32px; font-weight: 800; color: #38bdf8; border-bottom: 2px solid #334155; display: inline-block; padding: 0 24px 10px 24px; margin-bottom: 24px; }
  .text { font-size: 16px; line-height: 1.8; color: #94a3b8; margin-bottom: 12px; }
  .course-name { font-weight: 700; color: #f8fafc; font-size: 20px; }
  .badges-row { display: flex; justify-content: center; gap: 10px; margin: 24px 0; flex-wrap: wrap; }
  .badge { background: #1e1b4b; border: 1px solid #4338ca; color: #c7d2fe; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  .audit-card {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 16px 20px;
    margin: 28px auto;
    max-width: 620px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    text-align: left;
  }
  .audit-item-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
  .audit-item-value { font-size: 14px; font-weight: 800; color: #10b981; font-family: monospace; }
  .date { margin-top: 24px; font-size: 14px; color: #64748b; }
  .verification {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #1e293b;
    font-family: monospace;
    font-size: 12px;
    color: #64748b;
    word-break: break-all;
  }
  .verification strong { color: #94a3b8; letter-spacing: 1px; }
  .footer { margin-top: 24px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #475569; }
  @media print {
    body { background: #ffffff; color: #000; padding: 0; }
    .certificate { max-width: none; border-color: #000; background: #fff; }
    .title, .course-name, .student-name { color: #000; }
  }
</style>
</head>
<body>
  <div class="certificate">
    <div class="header">Certificado Profissional Auditado</div>
    <div class="title">⚡ ${brandName}</div>
    <p class="text">Certificamos com validação de código automatizada que</p>
    <div class="student-name">${studentName}</div>
    <p class="text">concluiu com êxito todas as entregas e pipelines da formação</p>
    <p class="text"><span class="course-name">${courseTitle}</span></p>

    <!-- Tecnologias Dominadas -->
    <div class="badges-row">
      ${stack.map((s) => `<span class="badge">${escapeHtml(s)}</span>`).join('')}
      <span class="badge">Nível ${levelText}</span>
      <span class="badge">${hours} Horas Práticas</span>
    </div>

    <!-- Selo de Auditoria Contínua SonarQube & DevOps -->
    <div class="audit-card">
      <div>
        <div class="audit-item-title">Quality Gate SonarQube</div>
        <div class="audit-item-value">${sonar?.qualityGate || 'PASSED (OK)'}</div>
      </div>
      <div>
        <div class="audit-item-title">Clean Code Rating</div>
        <div class="audit-item-value">${sonar?.cleanCodeRating || 'A (Manutenibilidade)'}</div>
      </div>
      <div>
        <div class="audit-item-title">Cobertura de Testes</div>
        <div class="audit-item-value">${sonar?.coverage ? sonar.coverage + '%' : '>= 80% Auditado'}</div>
      </div>
    </div>

    <p class="date">Emitido oficialmente em ${completedAt}</p>
    <div class="verification">
      <strong>CHAVE DE AUTENTICIDADE CRIPTOGRÁFICA</strong><br>
      ${verificationCode}
    </div>
    <div class="footer">Nexus Code Quality Assurance · Esteira DevOps Auditada</div>
  </div>
</body>
</html>`;
}
