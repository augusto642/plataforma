'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthView from '../components/AuthView';

export default function LoginPage() {
  const router = useRouter();

  const handleAuth = (user: { id: string; name: string; email: string; role: string }) => {
    try {
      localStorage.setItem('user_session', JSON.stringify(user));
    } catch {}
    router.push('/dashboard');
  };

  return <AuthView onAuth={handleAuth} />;
}
