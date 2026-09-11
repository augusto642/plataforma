import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as crypto from 'crypto';

export function generateRandomPassword(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export interface CreateGiteaUserParams {
  username: string;
  email: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface CreateRepoParams {
  name: string;
  description?: string;
  isPrivate?: boolean;
  autoInit?: boolean;
}

export interface GenerateRepoFromTemplateParams {
  templateOwner: string;
  templateRepo: string;
  newOwner: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export type GiteaUserDeletionStatus = 'deleted' | 'deactivated' | 'not_found' | 'failed';

export interface GiteaDeletionResult {
  ok: boolean;
  pending: boolean;
  userStatus: GiteaUserDeletionStatus;
  reposDeleted: string[];
  reposRenamed: string[];
  reposFailed: string[];
}

@Injectable()
export class GiteaService {
  private readonly logger = new Logger(GiteaService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly orgName: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>('GITEA_URL') || 'http://localhost:3030').replace(/\/+$/, '');
    this.token = this.config.get<string>('GITEA_TOKEN') || '';
    this.orgName = this.config.get<string>('GITEA_ORG') || 'plataforma';
  }

  private async request<T>(path: string, options: { method?: string; body?: any } = {}): Promise<{ status: number; data: T }> {
    const { method = 'GET', body } = options;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const isTest = process.env.NODE_ENV === 'test';
    const maxRetries = isTest ? 1 : 3;
    const baseDelayMs = 500;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(10000),
        });

        const contentType = response.headers.get('content-type') || '';
        let data: any = null;
        if (contentType.includes('application/json')) {
          data = await response.json().catch(() => null);
        }

        if (response.ok || attempt === maxRetries - 1) {
          return { status: response.status, data };
        }

        if (response.status >= 500) {
          const jitter = Math.random() * 200;
          const delay = baseDelayMs * 2 ** attempt + jitter;
          this.logger.warn(`Gitea request to ${path} returned ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return { status: response.status, data };
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.error(`Failed Gitea request to ${path} after ${maxRetries} attempts: ${err.message}`);
          throw err;
        }
        const jitter = Math.random() * 200;
        const delay = baseDelayMs * 2 ** attempt + jitter;
        this.logger.warn(`Gitea request to ${path} failed (${err.message}), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Gitea request to ${path} failed after ${maxRetries} retries`);
  }

  async findUser(username: string): Promise<any | null> {
    const res = await this.request<any>(`/api/v1/users/${username}`);
    if (res.status === 200) return res.data;
    return null;
  }

  async createUser(params: CreateGiteaUserParams): Promise<{ id: number; username: string } | null> {
    const password = params.password ?? generateRandomPassword();
    const payload = {
      username: params.username,
      login_name: params.username,
      email: params.email,
      password,
      must_change_password: params.mustChangePassword ?? true,
      send_notify: false,
      visibility: 'public',
    };

    const res = await this.request<any>('/api/v1/admin/users', {
      method: 'POST',
      body: payload,
    });

    if (res.status === 201) {
      this.logger.log(`Gitea user created: ${params.username} (id: ${res.data.id})`);
      return { id: res.data.id, username: res.data.username };
    }

    if (res.status === 409 || res.status === 422) {
      const existing = await this.findUser(params.username);
      if (existing) {
        return { id: existing.id, username: existing.username };
      }
    }

    if (res.status === 422) {
      const existing = await this.findUser(params.username);
      if (existing) return { id: existing.id, username: existing.username };
    }

    this.logger.warn(`Could not create Gitea user ${params.username}, status: ${res.status}`);
    return null;
  }

  async createOrgRepo(params: CreateRepoParams): Promise<any | null> {
    const payload = {
      name: params.name,
      description: params.description || '',
      private: params.isPrivate ?? true,
      auto_init: params.autoInit ?? true,
    };

    const res = await this.request<any>(`/api/v1/orgs/${this.orgName}/repos`, {
      method: 'POST',
      body: payload,
    });

    if (res.status === 201) {
      return res.data;
    }
    return null;
  }

  async generateRepoFromTemplate(params: GenerateRepoFromTemplateParams): Promise<any | null> {
    const payload = {
      owner: params.newOwner,
      name: params.name,
      description: params.description || '',
      private: params.isPrivate ?? true,
      git_content: true,
      topics: true,
    };

    const res = await this.request<any>(
      `/api/v1/repos/${params.templateOwner}/${params.templateRepo}/generate`,
      {
        method: 'POST',
        body: payload,
      },
    );

    if (res.status === 201) {
      return res.data;
    }
    return null;
  }

  async addCollaborator(owner: string, repo: string, username: string, permission: 'read' | 'write' | 'admin' = 'write'): Promise<boolean> {
    const res = await this.request<any>(`/api/v1/repos/${owner}/${repo}/collaborators/${username}`, {
      method: 'PUT',
      body: { permission },
    });
    return res.status === 204;
  }

  async createWebhook(owner: string, repo: string, webhookUrl: string, secret?: string): Promise<any | null> {
    const payload = {
      type: 'gitea',
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: secret || '',
      },
      events: ['push'],
      active: true,
    };

    const res = await this.request<any>(`/api/v1/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: payload,
    });

    if (res.status === 201) {
      return res.data;
    }
    return null;
  }

  async getFileContent(owner: string, repo: string, filepath: string, ref?: string): Promise<string | null> {
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const res = await this.request<any>(`/api/v1/repos/${owner}/${repo}/contents/${filepath}${query}`);
    if (res.status === 200 && res.data?.content) {
      return Buffer.from(res.data.content, 'base64').toString('utf8');
    }
    return null;
  }

  async provisionStudentRepo(params: {
    studentUsername: string;
    studentEmail: string;
    activitySlug: string;
    templateRepo?: string;
    webhookCallbackUrl?: string;
    webhookSecret?: string;
  }): Promise<{ repoName: string; cloneUrl: string } | null> {
    const repoName = `${params.activitySlug}-${params.studentUsername}`.toLowerCase();

    // 1. Ensure user exists
    await this.createUser({
      username: params.studentUsername,
      email: params.studentEmail,
    });

    // 2. Create or fork repo
    let repo: any = null;
    if (params.templateRepo) {
      repo = await this.generateRepoFromTemplate({
        templateOwner: this.orgName,
        templateRepo: params.templateRepo,
        newOwner: this.orgName,
        name: repoName,
        isPrivate: true,
      });
    } else {
      repo = await this.createOrgRepo({
        name: repoName,
        isPrivate: true,
        autoInit: true,
      });
    }

    // 3. Add student as collaborator
    await this.addCollaborator(this.orgName, repoName, params.studentUsername, 'write');

    // 4. Configure webhook if URL is provided
    if (params.webhookCallbackUrl) {
      await this.createWebhook(this.orgName, repoName, params.webhookCallbackUrl, params.webhookSecret);
    }

    return {
      repoName,
      cloneUrl: `${this.baseUrl}/${this.orgName}/${repoName}.git`,
    };
  }

  async listOrgRepos(): Promise<any[]> {
    const all: any[] = [];
    const pageSize = 50;
    let page = 1;
    for (;;) {
      const res = await this.request<any[]>(`/api/v1/orgs/${this.orgName}/repos?limit=${pageSize}&page=${page}`);
      if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) break;
      all.push(...res.data);
      if (res.data.length < pageSize) break;
      page += 1;
    }
    return all;
  }

  async deleteReposByOwner(
    username: string,
    candidateRepoNames?: string[],
  ): Promise<{ deleted: string[]; failed: string[] }> {
    const exactNames = new Set(
      (candidateRepoNames ?? []).map((n) => n.toLowerCase()),
    );
    const candidates = new Map<string, { owner: string; repo: string }>();

    // a) Repos in the platform org following the pattern {activitySlug}-{username}.
    //    SEM candidatos exatos, NÃO tocamos nos repos da org: o match por
    //    sufixo pode apagar o repo de outro aluno (ex.: soma-outro-aluno para
    //    o usuário "aluno"). Só removemos repos owned pelo próprio usuário (b).
    if (exactNames.size > 0) {
      const orgRepos = await this.listOrgRepos();
      for (const repo of orgRepos) {
        const name: string = repo?.name ?? '';
        const owner: string = repo?.owner?.login ?? this.orgName;
        if (exactNames.has(name.toLowerCase())) {
          candidates.set(`${owner}/${name}`, { owner, repo: name });
        }
      }
    }

    // b) Repos owned by the student user (defensive; platform repos live in the org)
    try {
      const res = await this.request<any[]>(`/api/v1/users/${encodeURIComponent(username)}/repos?limit=50&page=1`);
      if (res.status === 200 && Array.isArray(res.data)) {
        for (const repo of res.data) {
          const name: string = repo?.name ?? '';
          const owner: string = repo?.owner?.login ?? username;
          candidates.set(`${owner}/${name}`, { owner, repo: name });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to list Gitea repos owned by ${username}: ${err.message}`);
    }

    const deleted: string[] = [];
    const failed: string[] = [];
    for (const { owner, repo } of candidates.values()) {
      try {
        const res = await this.request<any>(`/api/v1/repos/${owner}/${repo}`, { method: 'DELETE' });
        if (res.status === 204 || res.status === 200 || res.status === 404) {
          deleted.push(`${owner}/${repo}`);
        } else {
          failed.push(`${owner}/${repo}`);
          this.logger.warn(`Gitea repo deletion failed for ${owner}/${repo}, status ${res.status}`);
        }
      } catch (err: any) {
        failed.push(`${owner}/${repo}`);
        this.logger.warn(`Gitea repo deletion failed for ${owner}/${repo}: ${err.message}`);
      }
    }

    if (deleted.length > 0) {
      this.logger.log(`Deleted Gitea repos of ${username}: ${deleted.join(', ')}`);
    }
    return { deleted, failed };
  }

  async deleteUserByUsername(username: string): Promise<GiteaUserDeletionStatus> {
    // Preferred path: Gitea admin user deletion (available since Gitea 1.22).
    try {
      const res = await this.request<any>(`/api/v1/admin/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      if (res.status === 200 || res.status === 204) {
        this.logger.log(`Deleted Gitea user ${username}`);
        return 'deleted';
      }
      if (res.status === 404) return 'not_found';
      this.logger.warn(`Gitea admin user delete not supported/denied for ${username}, status ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`Gitea user delete request failed for ${username}: ${err.message}`);
    }

    // Fallback: deactivate the account (revokes access) when deletion is unsupported.
    try {
      const res = await this.request<any>(`/api/v1/admin/users/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        body: { active: false, prohibit_login: true },
      });
      if (res.status === 200 || res.status === 204) {
        this.logger.log(`Deactivated Gitea user ${username} (delete unsupported)`);
        return 'deactivated';
      }
      if (res.status === 404) return 'not_found';
      this.logger.warn(`Could not deactivate Gitea user ${username}, status ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`Gitea user deactivation failed for ${username}: ${err.message}`);
    }
    return 'failed';
  }

  private async markReposAsDeleted(repos: string[], username: string): Promise<string[]> {
    const renamed: string[] = [];
    for (const full of repos) {
      const [owner, repo] = full.split('/');
      if (!owner || !repo) continue;
      const hash = createHash('sha256').update(`${full}@${username}`).digest('hex').slice(0, 10);
      const newName = `${repo}-deleted-${hash}`;
      try {
        const res = await this.request<any>(`/api/v1/repos/${owner}/${repo}`, {
          method: 'PATCH',
          body: { name: newName },
        });
        if (res.status === 200) renamed.push(full);
      } catch (err: any) {
        this.logger.warn(`Could not mark Gitea repo as deleted ${full}: ${err.message}`);
      }
    }
    return renamed;
  }

  async propagateDeletion(
    username: string,
    candidateRepoNames?: string[],
  ): Promise<GiteaDeletionResult> {
    const result: GiteaDeletionResult = {
      ok: false,
      pending: true,
      userStatus: 'failed',
      reposDeleted: [],
      reposRenamed: [],
      reposFailed: [],
    };

    // 1. Remove the student repos (org pattern + user-owned).
    try {
      const { deleted, failed } = await this.deleteReposByOwner(
        username,
        candidateRepoNames,
      );
      result.reposDeleted = deleted;
      result.reposFailed = failed;
    } catch (err: any) {
      this.logger.error(`deleteReposByOwner failed for ${username}: ${err.message}`);
      result.reposFailed = [`unexpected: ${err.message}`];
    }

    // 2. Delete (or deactivate) the Gitea user.
    try {
      result.userStatus = await this.deleteUserByUsername(username);
    } catch (err: any) {
      this.logger.error(`deleteUserByUsername failed for ${username}: ${err.message}`);
    }

    // 3. Mark repos that could not be deleted with a -deleted-<hash> suffix so
    //    they stay identifiable while the account is gone.
    if (result.reposFailed.length > 0) {
      result.reposRenamed = await this.markReposAsDeleted(result.reposFailed, username);
      result.reposFailed = result.reposFailed.filter((r) => !result.reposRenamed.includes(r));
    }

    result.pending = result.userStatus === 'failed' || result.reposFailed.length > 0;
    result.ok = !result.pending;

    if (result.pending) {
      this.logger.warn(`deletionQueued: Gitea deletion incomplete for ${username}`, JSON.stringify(result));
    } else {
      this.logger.log(
        `Gitea data removed for ${username}: user=${result.userStatus}, repos deleted=${result.reposDeleted.length}`,
      );
    }
    return result;
  }
}
