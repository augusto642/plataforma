'use client';

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AVATAR_PRESETS, BANNER_PRESETS } from '../data';

interface ProfileEditModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}

export function ProfileEditModal({ isOpen, profile, onClose, onSave }: ProfileEditModalProps) {
  const [modalTab, setModalTab] = useState<'info' | 'appearance'>('info');

  // Dados Gerais
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [specialty, setSpecialty] = useState(profile.specialty);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);

  // Customização Visual
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [avatarPresetId, setAvatarPresetId] = useState(profile.avatarPresetId || 'cyber-samurai');
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || '');
  const [bannerTheme, setBannerTheme] = useState(profile.bannerTheme || 'deep-obsidian');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      role,
      specialty,
      bio,
      location,
      avatarUrl,
      avatarPresetId,
      bannerUrl,
      bannerTheme
    });
    onClose();
  };

  const selectedBannerPreset = BANNER_PRESETS.find((b) => b.id === bannerTheme);
  const previewBannerBackground = bannerUrl
    ? `url(${bannerUrl}) center/cover no-repeat`
    : selectedBannerPreset
    ? selectedBannerPreset.gradient
    : 'linear-gradient(135deg, #18112e 0%, #0d1e2e 50%, #09211d 100%)';

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
          borderRadius: '24px',
          maxWidth: '640px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.3px' }}>
              Personalização do Perfil
            </h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
              Configure sua identidade de engenheiro, imagem de avatar e capa de fundo.
            </p>
          </div>
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

        {/* TABS DO MODAL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #262630',
            marginBottom: '20px',
            paddingBottom: '10px'
          }}
        >
          <button
            type="button"
            onClick={() => setModalTab('info')}
            style={{
              background: modalTab === 'info' ? 'rgba(130, 87, 229, 0.2)' : 'transparent',
              border: `1px solid ${modalTab === 'info' ? '#8257E5' : 'transparent'}`,
              color: modalTab === 'info' ? '#FFF' : '#A1A1AA',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📝</span> Informações Gerais
          </button>

          <button
            type="button"
            onClick={() => setModalTab('appearance')}
            style={{
              background: modalTab === 'appearance' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              border: `1px solid ${modalTab === 'appearance' ? '#00E5FF' : 'transparent'}`,
              color: modalTab === 'appearance' ? '#FFF' : '#A1A1AA',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🎨</span> Imagem &amp; Capa de Fundo
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {modalTab === 'info' ? (
            <>
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
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#FFF',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
                    Cargo / Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#16161D',
                      border: '1px solid #262630',
                      borderRadius: '10px',
                      padding: '10px 14px',
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
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#FFF',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
                  Especialidade Técnica Principal
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#16161D',
                    border: '1px solid #262630',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#FFF',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>
                  Biografia Técnica
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#16161D',
                    border: '1px solid #262630',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#FFF',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.5
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* LIVE PREVIEW DA CAPA E AVATAR */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#A1A1AA', display: 'block', marginBottom: '8px' }}>
                  Pré-visualização em Tempo Real
                </span>
                <div
                  style={{
                    height: '110px',
                    background: previewBannerBackground,
                    borderRadius: '14px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid #262630',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '12px'
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: '#16161D',
                      border: '2px solid #8257E5',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '24px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ marginLeft: '12px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>{name || 'Nome do Aluno'}</div>
                    <div style={{ fontSize: '11px', color: '#00E5FF' }}>{role || 'Desenvolvedor'}</div>
                  </div>
                </div>
              </div>

              {/* OPÇÃO 1: FOTO / AVATAR DO ALUNO */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#EDEDED', display: 'block', marginBottom: '6px' }}>
                  Imagem do Aluno (URL Personalizada)
                </label>
                <input
                  type="text"
                  placeholder="https://sua-imagem.com/foto.jpg ou GitHub avatar URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#16161D',
                    border: '1px solid #262630',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#FFF',
                    outline: 'none',
                    marginBottom: '10px'
                  }}
                />

                <span style={{ fontSize: '11px', color: '#71717A', display: 'block', marginBottom: '8px' }}>
                  Ou selecione um Avatar Estilo Cyber RPG da galeria oficial:
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = avatarPresetId === preset.id || avatarUrl === preset.avatarUrl;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => {
                          setAvatarPresetId(preset.id);
                          setAvatarUrl(preset.avatarUrl);
                        }}
                        style={{
                          background: isSelected ? 'rgba(130, 87, 229, 0.2)' : '#16161D',
                          border: `2px solid ${isSelected ? preset.accentColor : '#262630'}`,
                          borderRadius: '12px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <img
                          src={preset.avatarUrl}
                          alt={preset.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            objectFit: 'cover'
                          }}
                        />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? '#FFF' : '#A1A1AA' }}>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OPÇÃO 2: CAPA DE FUNDO PERSONALIZADA */}
              <div style={{ borderTop: '1px solid #1F1F2B', paddingTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#EDEDED', display: 'block', marginBottom: '6px' }}>
                  Capa de Fundo (Banner URL Personalizada)
                </label>
                <input
                  type="text"
                  placeholder="https://link-da-sua-capa.com/banner.png (opcional)"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#16161D',
                    border: '1px solid #262630',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#FFF',
                    outline: 'none',
                    marginBottom: '10px'
                  }}
                />

                <span style={{ fontSize: '11px', color: '#71717A', display: 'block', marginBottom: '8px' }}>
                  Ou escolha um Tema Cyber Cibernético para a capa:
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                  {BANNER_PRESETS.map((preset) => {
                    const isSelected = bannerTheme === preset.id && !bannerUrl;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => {
                          setBannerTheme(preset.id);
                          setBannerUrl(''); // limpa URL para usar o tema
                        }}
                        style={{
                          background: preset.gradient,
                          border: `2px solid ${isSelected ? preset.previewColor : '#262630'}`,
                          borderRadius: '12px',
                          padding: '12px 8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          boxShadow: isSelected ? `0 0 12px ${preset.previewColor}60` : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF', display: 'block' }}>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #262630', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#16161D',
                border: '1px solid #262630',
                color: '#EDEDED',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
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
                padding: '10px 24px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(130, 87, 229, 0.4)'
              }}
            >
              Salvar Perfil Customizado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
