'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';

export interface UseNicknameDebounceReturn {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
  validateNickname: (nickname: string) => void;
}

export function useNicknameDebounce(initialNickname: string = '', debounceMs: number = 350): UseNicknameDebounceReturn {
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateNickname = useCallback((name: string) => {
    setNickname(name);
  }, []);

  useEffect(() => {
    const trimmed = nickname.trim();

    // Limpa timers e requisições anteriores
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Se estiver vazio, reseta estados
    if (!trimmed) {
      setIsChecking(false);
      setIsAvailable(null);
      setError(null);
      return;
    }

    // Validação local de tamanho e caracteres permitidos
    const NICKNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
    if (trimmed.length < 3) {
      setIsChecking(false);
      setIsAvailable(false);
      setError('Mínimo de 3 caracteres necessários.');
      return;
    }
    if (trimmed.length > 16) {
      setIsChecking(false);
      setIsAvailable(false);
      setError('Máximo de 16 caracteres excedido.');
      return;
    }
    if (!NICKNAME_REGEX.test(trimmed)) {
      setIsChecking(false);
      setIsAvailable(false);
      setError('Apenas letras, números e sublinhado (_) são permitidos.');
      return;
    }

    // Passou na validação sintática preliminar: inicia verificação de debounce
    setIsChecking(true);
    setIsAvailable(null);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiFetch(`/users/check-nickname?nickname=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          const available = data.available !== false;
          setIsAvailable(available);
          if (!available) {
            setError('Este codename já está em uso na rede.');
          } else {
            setError(null);
          }
        } else {
          // Se a rota do backend retornar 404 ou erro, consideramos disponível em modo offline/dev
          setIsAvailable(true);
          setError(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fallback resiliente offline
        setIsAvailable(true);
        setError(null);
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [nickname, debounceMs]);

  return {
    isChecking,
    isAvailable,
    error,
    validateNickname,
  };
}
