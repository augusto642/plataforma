'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthView from '../components/AuthView';

export default function LoginPage() {
  const router = useRouter();

  const handleAuth = (user: { id: string; name: string; email: string; role: string }) => {
    // Sessão já hidratada pelo AuthContext via cookie httpOnly + /users/me;
    // nada de tokens/estado de auth em localStorage.
    router.push('/dashboard');
  };

  return <AuthView onAuth={handleAuth} />;
}
