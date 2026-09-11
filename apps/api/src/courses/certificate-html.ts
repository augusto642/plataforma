export interface CertificateData {
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  completedAt: Date;
  verificationCode: string;
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
  const brandName = escapeHtml(process.env.BRAND_NAME || 'Plataforma');
  const completedAt = data.completedAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const verificationCode = escapeHtml(data.verificationCode);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificado ${brandName} — ${courseTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #f1f5f9;
    font-family: Georgia, 'Times New Roman', serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }
  .certificate {
    background: #ffffff;
    width: 100%;
    max-width: 820px;
    border: 6px double #1e3a5f;
    outline: 1px solid #1e3a5f;
    outline-offset: 8px;
    padding: 64px 56px;
    text-align: center;
    color: #1e293b;
  }
  .header { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: #64748b; margin-bottom: 28px; }
  .title { font-size: 40px; font-weight: 700; color: #1e3a5f; margin-bottom: 30px; }
  .student-name { font-size: 32px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding: 0 24px 10px 24px; margin-bottom: 30px; }
  .text { font-size: 17px; line-height: 1.8; color: #334155; margin-bottom: 12px; }
  .course-name { font-weight: 700; color: #1e3a5f; }
  .date { margin-top: 36px; font-size: 15px; color: #475569; }
  .verification {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: #64748b;
    word-break: break-all;
  }
  .verification strong { color: #334155; font-family: Georgia, serif; letter-spacing: 1px; }
  .footer { margin-top: 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; }
  @media print {
    body { background: #ffffff; padding: 0; }
    .certificate { max-width: none; }
  }
</style>
</head>
<body>
  <div class="certificate">
    <div class="header">Certificado de Conclusão</div>
    <div class="title">⚡ ${brandName}</div>
    <p class="text">Certificamos que</p>
    <div class="student-name">${studentName}</div>
    <p class="text">concluiu com êxito todas as atividades do curso</p>
    <p class="text"><span class="course-name">${courseTitle}</span></p>
    <p class="date">Concluído em ${completedAt}</p>
    <div class="verification">
      <strong>CÓDIGO DE VERIFICAÇÃO</strong><br>
      ${verificationCode}
    </div>
    <div class="footer">Emitido por ${brandName}</div>
  </div>
</body>
</html>`;
}
