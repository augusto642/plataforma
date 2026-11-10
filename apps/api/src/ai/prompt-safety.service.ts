import { Injectable } from '@nestjs/common';

/**
 * M12 — Segurança de prompt da tutora (extraído do AiService god service).
 *
 * Funções puras, sem dependência de banco ou LLM: sanitização de dados
 * sensíveis, detecção de jailbreak/prompt injection e o guardrail
 * anti-spoiler que impede o vazamento da solução em blocos de código.
 * Usado pelo chat da tutora, pelas dicas pedagógicas e pelo
 * LineFeedbackService (via fachada AiService).
 */
@Injectable()
export class PromptSafetyService {
  sanitizePrompt(text: string): string {
    if (!text) return '';
    return text
      // Redact emails
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      // Redact Brazilian CPFs
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_REDACTED]')
      // Redact Brazilian CNPJs
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_REDACTED]')
      // Redact Brazilian Phones
      .replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g, '[PHONE_REDACTED]')
      // Redact IPv4 addresses
      .replace(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, '[IP_REDACTED]')
      // Redact API keys and tokens
      .replace(/(?:sk-|ghp_|Bearer\s+)[A-Za-z0-9_\-]{16,}/g, '[TOKEN_REDACTED]')
      // Redact potential passwords in strings
      .replace(/(?:password|senha)\s*[:=]\s*["'][^"']+["']/gi, 'password: "[REDACTED]"');
  }

  detectJailbreakOrBypass(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const jailbreakPatterns = [
      'ignore previous instructions',
      'ignore all instructions',
      'ignore as regras',
      'esqueça as regras',
      'give me the full solution',
      'give me the code',
      'escreva o codigo completo',
      'resolva para mim',
      'me dê a resposta pronta',
      'bypass guardrails',
      'system prompt',
      'developer mode',
      'modo desenvolvedor',
    ];
    return jailbreakPatterns.some((pattern) => lower.includes(pattern));
  }

  applyAntiSpoilerGuardrail(content: string): string {
    if (!content) return '';
    const codeBlockRegex = /```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g;
    return content.replace(codeBlockRegex, (match, codeInside) => {
      const lines = codeInside.trim().split('\n');
      if (lines.length > 3) {
        return '*(Dica Socrática: O código completo da solução foi omitido para estimular seu raciocínio. Tente estruturar os passos da lógica por conta própria!)*';
      }
      return match;
    });
  }
}
