'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import AuthView from '../../components/AuthView';

export default function LoginPage() {
  const router = useRouter();

  const handleAuth = (user: { id: string; name: string; email: string; role: string }) => {
    // Sessão já hidratada pelo AuthContext via cookie httpOnly + /users/me;
    // nada de tokens/estado de auth em localStorage.
    router.push('/dashboard');
  };

  // Suspense: o AuthView lê `?oauth_error=` com useSearchParams (o
  // callback OAuth volta para cá em caso de falha) e o App Router exige
  // o boundary em volta.
  return (
    <Suspense>
      <AuthView onAuth={handleAuth} />
    </Suspense>
  );
}
