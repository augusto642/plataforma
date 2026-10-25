#!/usr/bin/env node
/**
 * Cliente Drive real (Q1 — service account, escopo drive.readonly apenas).
 * Implementado com Node puro (node:crypto + fetch), sem dependência externa:
 * JWT RS256 assinado com a private_key da conta de serviço, trocado por
 * access token em oauth2.googleapis.com/token, e chamadas Drive API v3
 * (files.get metadata, files.get ?alt=media download, files.list).
 *
 * Segurança (regra dura, sem exceção):
 * - A credencial entra como objeto em memória (parse de
 *   GOOGLE_DRIVE_CREDENTIALS) e NUNCA é impressa, logada, persistida ou
 *   incluída em mensagem de erro — nem client_email, project_id,
 *   private_key ou token. Erros carregam só status HTTP e contexto
 *   operacional (id do arquivo, operação).
 * - Escopo mínimo: https://www.googleapis.com/auth/drive.readonly.
 * - supportsAllDrives=true em todas as chamadas: os cursos vivem em
 *   drives compartilhados; sem o flag, files.get devolve 404.
 * - O acesso efetivo a pastas vem do COMPARTILHAMENTO no Drive (papel
 *   Leitor): sem ele, a API devolve 403/404 — isso é bloqueio de
 *   compartilhamento, não falha do cliente. Nunca contornar com outra
 *   credencial nem tornar nada público.
 *
 * Uso:
 *   import { createDriveClient, parseServiceAccountCredentials } from './drive-client.mjs';
 *   const client = createDriveClient(parseServiceAccountCredentials(process.env.GOOGLE_DRIVE_CREDENTIALS));
 *   const meta = await client.getFileMetadata(driveFileId);
 *   await client.downloadFile(driveFileId, destPath, meta.size);
 *   const files = await client.listFiles({ q: "modifiedTime > '2026-01-01T00:00:00Z' and trashed = false" });
 */
import { createWriteStream } from 'node:fs';
import { sign } from 'node:crypto';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export class DriveApiError extends Error {
  constructor(operation, status, detail) {
    super(`Drive ${operation} falhou (HTTP ${status})${detail ? `: ${detail}` : ''}`);
    this.name = 'DriveApiError';
    this.operation = operation;
    this.status = status;
  }
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

/** Valida a forma da chave (sem expor nenhum valor): só booleanos entram em erro. */
export function parseServiceAccountCredentials(raw) {
  let obj;
  try {
    obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('credencial Drive inválida: JSON ilegível');
  }
  if (!obj || obj.type !== 'service_account' || !obj.client_email || !obj.private_key || !obj.token_uri) {
    throw new Error('credencial Drive inválida: falta type=service_account, client_email, private_key ou token_uri');
  }
  return obj;
}

export function createJwt(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: SCOPE,
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now,
  }));
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), credentials.private_key);
  return `${header}.${payload}.${base64url(signature)}`;
}

export function createDriveClient(credentials) {
  let cached = null; // { token, expiresAt } — só em memória, nunca logado
  async function getToken() {
    if (cached && Date.now() < cached.expiresAt - 60000) return cached.token;
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: createJwt(credentials),
      }),
    });
    if (!res.ok) {
      // Corpo do erro de token NÃO é repassado: pode conter detalhes da conta.
      throw new DriveApiError('token', res.status, 'troca JWT→token recusada (verificar chave e relógio do sistema)');
    }
    const body = await res.json();
    cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 };
    return cached.token;
  }
  async function api(path, { method = 'GET', acceptJson = true } = {}) {
    const token = await getToken();
    const res = await fetch(`${DRIVE_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        const msg = body?.error?.errors?.[0]?.reason || body?.error?.message || '';
        // Só o reason/message genérico da API; nunca token ou credencial.
        if (msg && msg.length < 200) detail = msg;
      } catch { /* corpo ilegível: segue sem detalhe */ }
      throw new DriveApiError(path.split('?')[0], res.status, detail);
    }
    return acceptJson ? res.json() : res;
  }
  return {
    /** Prova de autenticação sem expor nada: true se o token foi emitido. */
    async checkAuth() {
      await getToken();
      return true;
    },
    async getFileMetadata(fileId) {
      const fields = 'id,name,mimeType,size,md5Checksum,modifiedTime,trashed';
      return api(`/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`);
    },
    async downloadFile(fileId, destPath, expectedSize) {
      const res = await api(`/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { acceptJson: false });
      await new Promise((resolvePromise, reject) => {
        const out = createWriteStream(destPath);
        let bytes = 0;
        res.body.on('data', (chunk) => { bytes += chunk.length; });
        res.body.on('error', reject);
        out.on('error', reject);
        out.on('finish', () => {
          if (expectedSize !== undefined && expectedSize !== null && Number(expectedSize) !== bytes) {
            reject(new Error(`download incompleto de ${fileId}: esperado ${expectedSize} bytes, recebidos ${bytes}`));
            return;
          }
          resolvePromise();
        });
        res.body.pipe(out);
      });
      return destPath;
    },
    async listFiles({ q, pageSize = 100 } = {}) {
      const out = [];
      let pageToken;
      do {
        const params = new URLSearchParams({
          pageSize: String(pageSize),
          supportsAllDrives: 'true',
          includeItemsFromAllDrives: 'true',
          fields: 'nextPageToken,files(id,name,mimeType,size,md5Checksum,modifiedTime,trashed,parents)',
        });
        if (q) params.set('q', q);
        if (pageToken) params.set('pageToken', pageToken);
        const body = await api(`/files?${params.toString()}`);
        out.push(...(body.files || []));
        pageToken = body.nextPageToken;
      } while (pageToken);
      return out;
    },
    async listFolderChildren(folderId) {
      return this.listFiles({ q: `'${folderId}' in parents and trashed = false`, pageSize: 100 });
    },
  };
}
