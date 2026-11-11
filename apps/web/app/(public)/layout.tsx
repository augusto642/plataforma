import React from 'react';

// B75 (Sprint 18 · Volta 3 · TL M2) — layout do grupo (public):
// propositalmente NENHUM provider. A landing e as páginas legais/de
// contato/verificação não consomem sessão (conferido: nenhum useAuth
// ou useQuery nestas rotas) — elas não disparam mais o probe de
// /users/me por visita, que era o problema que a allowlist manual do
// AuthContext remendava. O esqueleto (html/body/fontes) é do layout
// raiz.
export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
