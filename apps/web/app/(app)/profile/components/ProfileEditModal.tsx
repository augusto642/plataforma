'use client';

import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileEditModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}

export function ProfileEditModal({ isOpen, profile, onClose, onSave }: ProfileEditModalProps) {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [specialty, setSpecialty] = useState(profile.specialty);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, role, specialty, bio, location });
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          background: '#101015',
          border: '1px solid #262630',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: 0 }}>
            Editar Informações do Perfil
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#16161D',
              border: '1px solid #262630',
              color: '#A1A1AA',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                background: '#16161D',
                border: '1px solid #262630',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#FFF',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
                Cargo Principal
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  background: '#16161D',
                  border: '1px solid #262630',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#FFF',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
                Localização
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  background: '#16161D',
                  border: '1px solid #262630',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#FFF',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
              Especialidade Técnica
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              style={{
                width: '100%',
                background: '#16161D',
                border: '1px solid #262630',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#FFF',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
              Biografia de Engenheiro
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{
                width: '100%',
                background: '#16161D',
                border: '1px solid #262630',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#FFF',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#16161D',
                border: '1px solid #262630',
                color: '#EDEDED',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #8257E5, #632cd6)',
                border: 'none',
                color: '#FFF',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
