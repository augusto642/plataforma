import { GiteaService } from './gitea.service';

describe('GiteaService deletion propagation', () => {
  let service: GiteaService;
  let fetchMock: jest.Mock;

  const config = {
    get: (key: string) => (key === 'GITEA_ORG' ? 'plataforma' : undefined),
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    service = new GiteaService(config as any);
  });

  function jsonResponse(status: number, data: any = null) {
    return {
      status,
      headers: { get: () => 'application/json' },
      json: async () => data,
    };
  }

  describe('deleteUserByUsername', () => {
    it('deletes the user when the admin API supports it', async () => {
      fetchMock.mockResolvedValue(jsonResponse(204));

      const status = await service.deleteUserByUsername('aluno');

      expect(status).toBe('deleted');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3030/api/v1/admin/users/aluno',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('deactivates the user when deletion is unsupported', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(405))
        .mockResolvedValueOnce(jsonResponse(200, { active: false }));

      const status = await service.deleteUserByUsername('aluno');

      expect(status).toBe('deactivated');
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3030/api/v1/admin/users/aluno',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ active: false, prohibit_login: true }),
        }),
      );
    });

    it('reports not_found for missing users without extra calls', async () => {
      fetchMock.mockResolvedValue(jsonResponse(404));

      const status = await service.deleteUserByUsername('ghost');

      expect(status).toBe('not_found');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteReposByOwner', () => {
    it('deletes org repos matching the {slug}-{username} pattern and leaves others', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, [
            { name: 'soma-aluno', owner: { login: 'plataforma' } },
            { name: 'laco-aluno', owner: { login: 'plataforma' } },
            { name: 'soma-outro-aluno', owner: { login: 'plataforma' } },
          ]),
        )
        .mockResolvedValueOnce(jsonResponse(200, []))
        .mockResolvedValue(jsonResponse(204));

      const { deleted, failed } = await service.deleteReposByOwner('aluno', [
        'soma-aluno',
        'laco-aluno',
      ]);

      expect(deleted.sort()).toEqual(['plataforma/laco-aluno', 'plataforma/soma-aluno']);
      expect(failed).toEqual([]);
      const deleteCalls = fetchMock.mock.calls.filter(
        (c: any[]) => c[1]?.method === 'DELETE',
      );
      expect(deleteCalls).toHaveLength(2);
    });

    it('does not delete org repos when no exact candidates are provided (safety)', async () => {
      // Org repos NÃO podem ser removidos por heurística de sufixo: sem
      // candidatos exatos, apenas repos owned pelo próprio usuário são apagados.
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, [
            { name: 'trabalho-pessoal', owner: { login: 'aluno' } },
          ]),
        )
        .mockResolvedValue(jsonResponse(204));

      const { deleted, failed } = await service.deleteReposByOwner('aluno');

      expect(deleted).toEqual(['aluno/trabalho-pessoal']);
      expect(failed).toEqual([]);
      const orgListCalls = fetchMock.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('/orgs/'),
      );
      expect(orgListCalls).toHaveLength(0);
      const deleteCalls = fetchMock.mock.calls.filter(
        (c: any[]) => c[1]?.method === 'DELETE',
      );
      expect(deleteCalls).toHaveLength(1);
    });

    it('collects repos that fail to delete', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, [{ name: 'soma-aluno', owner: { login: 'plataforma' } }]),
        )
        .mockResolvedValueOnce(jsonResponse(200, []))
        .mockResolvedValue(jsonResponse(500));

      const { deleted, failed } = await service.deleteReposByOwner('aluno', [
        'soma-aluno',
      ]);

      expect(deleted).toEqual([]);
      expect(failed).toEqual(['plataforma/soma-aluno']);
    });
  });

  describe('propagateDeletion', () => {
    it('reports ok when repos and user are fully removed', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, [{ name: 'soma-aluno', owner: { login: 'plataforma' } }]),
        )
        .mockResolvedValueOnce(jsonResponse(200, []))
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(204));

      const result = await service.propagateDeletion('aluno', ['soma-aluno']);

      expect(result.ok).toBe(true);
      expect(result.pending).toBe(false);
      expect(result.userStatus).toBe('deleted');
      expect(result.reposDeleted).toEqual(['plataforma/soma-aluno']);
      expect(result.reposFailed).toEqual([]);
    });

    it('falls back to deactivation and marks failing repos as deleted', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, [{ name: 'soma-aluno', owner: { login: 'plataforma' } }]),
        )
        .mockResolvedValueOnce(jsonResponse(200, []))
        .mockResolvedValueOnce(jsonResponse(500))
        .mockResolvedValueOnce(jsonResponse(405))
        .mockResolvedValueOnce(jsonResponse(200, { active: false }))
        .mockResolvedValueOnce(jsonResponse(200, { name: 'soma-aluno-deleted-abc' }));

      const result = await service.propagateDeletion('aluno', ['soma-aluno']);

      expect(result.userStatus).toBe('deactivated');
      expect(result.reposRenamed).toEqual(['plataforma/soma-aluno']);
      expect(result.reposFailed).toEqual([]);
      expect(result.pending).toBe(false);

      const patch = fetchMock.mock.calls.find(
        (c: any[]) => c[1]?.method === 'PATCH' && String(c[0]).includes('/repos/'),
      );
      expect(patch).toBeDefined();
      const patchBody = JSON.parse(patch[1].body);
      expect(patchBody.name).toMatch(/^soma-aluno-deleted-[0-9a-f]{10}$/);
    });

    it('reports pending when repo deletion and user deactivation both fail', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, [{ name: 'soma-aluno', owner: { login: 'plataforma' } }]),
        )
        .mockResolvedValueOnce(jsonResponse(200, []))
        .mockResolvedValueOnce(jsonResponse(500))
        .mockResolvedValue(jsonResponse(500));

      const result = await service.propagateDeletion('aluno', ['soma-aluno']);

      expect(result.pending).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.userStatus).toBe('failed');
      expect(result.reposFailed).toEqual(['plataforma/soma-aluno']);
    });
  });
});
