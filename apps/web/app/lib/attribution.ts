// B11 — atribuição compartilhada do funil (UTMs B07 + diagnóstico B09).
//
// Antes, a captura/leitura vivia só dentro de /register: quem chegava pela
// landing (com UTMs na URL) e clicava num CTA para /onboarding perdia a
// atribuição, e o cadastro do onboarding nem passava pelo AuthContext.
// Agora a lógica é única: a landing e o /onboarding capturam na chegada, e
// TODA porta de cadastro (register e onboarding) lê daqui e envia pelo
// AuthContext — nenhuma porta perde UTM nem o token do diagnóstico.

// B07 — UTMs da URL de chegada persistem em sessionStorage e vão no payload
// do cadastro (padrão Codewars).
export const UTM_STORAGE_KEY = 'nexus_utm';

// B09 — quem fez o quiz (/diagnostico) antes de se cadastrar guarda o
// sessionToken bruto nesta chave; o cadastro o envia como
// diagnosticSessionToken para a API ligar o resultado à conta nova.
export const DIAGNOSTIC_STORAGE_KEY = 'nexus_diagnostic_token';

// Formato do payload da API (RegisterDto): camelCase. Os parâmetros da URL
// continuam snake_case (convenção UTM) e são traduzidos na captura.
export type UtmData = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

/** Captura as UTMs da URL atual para a sessionStorage (idempotente). */
export function captureUtmFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: UtmData = {};
    const source = params.get('utm_source');
    const medium = params.get('utm_medium');
    const campaign = params.get('utm_campaign');
    if (source) utm.utmSource = source;
    if (medium) utm.utmMedium = medium;
    if (campaign) utm.utmCampaign = campaign;
    if (Object.keys(utm).length > 0) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    // sessionStorage indisponível: atribuição é opcional, nunca bloqueia o cadastro
  }
}

/** Lê as UTMs guardadas já no formato do RegisterDto ({} se não houver). */
export function readStoredUtm(): UtmData {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UtmData & {
      // sessões abertas antes da correção da Sprint 1 podem ter snake_case
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
    const utm: UtmData = {};
    const source = parsed.utmSource ?? parsed.utm_source;
    const medium = parsed.utmMedium ?? parsed.utm_medium;
    const campaign = parsed.utmCampaign ?? parsed.utm_campaign;
    if (source) utm.utmSource = source;
    if (medium) utm.utmMedium = medium;
    if (campaign) utm.utmCampaign = campaign;
    return utm;
  } catch {
    return {};
  }
}

/** Lê o token do diagnóstico no formato do RegisterDto ({} se não houver). */
export function readStoredDiagnosticToken(): { diagnosticSessionToken?: string } {
  try {
    const token = sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    return token ? { diagnosticSessionToken: token } : {};
  } catch {
    return {};
  }
}

/** Após um cadastro bem-sucedido, o token do diagnóstico não é mais necessário. */
export function clearStoredDiagnosticToken(): void {
  try {
    sessionStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
  } catch {
    // sessionStorage indisponível: nada a limpar, nunca bloqueia o cadastro
  }
}
