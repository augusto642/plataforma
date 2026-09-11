'use client';

import React, { useState, useEffect } from 'react';
import {
  AdminUser,
  SystemMetric,
  CourseAdminItem,
  InstructorItem,
  AuditLogItem,
  CertificateItem,
  PistonClusterNode,
  AdminTab,
  AdminRole,
  CourseStatus,
  AdminChallengeItem,
} from './types';
import {
  INITIAL_ADMIN_USERS,
  INITIAL_SYSTEM_METRICS,
  INITIAL_COURSES,
  INITIAL_INSTRUCTORS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CERTIFICATES,
  INITIAL_PISTON_NODES,
} from './data/mockData';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminTopbar } from './components/AdminTopbar';
import { AdminOverviewTab } from './components/AdminOverviewTab';
import { AdminUsersTab } from './components/AdminUsersTab';
import { AdminInstructorsTab } from './components/AdminInstructorsTab';
import { AdminCoursesTab } from './components/AdminCoursesTab';
import { AdminSystemHealthTab } from './components/AdminSystemHealthTab';
import { AdminAuditLogsTab } from './components/AdminAuditLogsTab';

export default function AdminDashboardPage() {
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core State with hydration safety
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [metrics, setMetrics] = useState<SystemMetric>(INITIAL_SYSTEM_METRICS);
  const [courses, setCourses] = useState<CourseAdminItem[]>(INITIAL_COURSES);
  const [instructors, setInstructors] = useState<InstructorItem[]>(INITIAL_INSTRUCTORS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [certificates, setCertificates] = useState<CertificateItem[]>(INITIAL_CERTIFICATES);
  const [nodes, setNodes] = useState<PistonClusterNode[]>(INITIAL_PISTON_NODES);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('nexus_admin_users');
      if (savedUsers) setUsers(JSON.parse(savedUsers));

      const savedCourses = localStorage.getItem('nexus_admin_courses');
      if (savedCourses) setCourses(JSON.parse(savedCourses));

      const savedInstructors = localStorage.getItem('nexus_admin_instructors');
      if (savedInstructors) setInstructors(JSON.parse(savedInstructors));

      const savedLogs = localStorage.getItem('nexus_admin_logs');
      if (savedLogs) setAuditLogs(JSON.parse(savedLogs));

      const savedCerts = localStorage.getItem('nexus_admin_certs');
      if (savedCerts) setCertificates(JSON.parse(savedCerts));
    } catch {
      // ignore storage error
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const addAuditLog = (action: string, target: string, severity: 'info' | 'warn' | 'critical', details?: string) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: {
        id: users[0]?.id || 'usr-001',
        name: users[0]?.name || 'Augusto Lead Architect',
        role: 'admin',
        email: users[0]?.email || 'augusto@nexuscode.dev',
      },
      action,
      target,
      ipAddress: '189.40.122.14',
      severity,
      details,
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem('nexus_admin_logs', JSON.stringify(updated));
    } catch {}
  };

  // Actions
  const handlePromoteUser = (userId: string, newRole: AdminRole) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setUsers(updated);
    try {
      localStorage.setItem('nexus_admin_users', JSON.stringify(updated));
    } catch {}

    const targetUser = users.find((u) => u.id === userId);
    addAuditLog(
      'USER_ROLE_UPDATED',
      `${targetUser?.name || userId} -> ${newRole.toUpperCase()}`,
      'info',
      `Papel administrativo alterado para ${newRole}`
    );
    showToast(`Papel do usuário atualizado para "${newRole.toUpperCase()}" com sucesso.`);
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? 'suspended' : 'active';
        addAuditLog(
          nextStatus === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_ACTIVATED',
          `${u.name} (${u.email})`,
          nextStatus === 'suspended' ? 'warn' : 'info',
          `Status de acesso da conta modificado para ${nextStatus}`
        );
        return { ...u, status: nextStatus as 'active' | 'suspended' };
      }
      return u;
    });
    setUsers(updated);
    try {
      localStorage.setItem('nexus_admin_users', JSON.stringify(updated));
    } catch {}
    showToast('Status da conta atualizado com sucesso.');
  };

  const handleAdjustXp = (userId: string, amount: number) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, xp: u.xp + amount } : u));
    setUsers(updated);
    try {
      localStorage.setItem('nexus_admin_users', JSON.stringify(updated));
    } catch {}
    showToast(`Concedido +${amount} XP ao usuário.`);
  };

  const handleCreateInstructor = (data: {
    name: string;
    email: string;
    specialization: string;
    initialTrack: string;
  }) => {
    const newId = `usr-${Date.now().toString().slice(-4)}`;
    const initials = data.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newUser: AdminUser = {
      id: newId,
      name: data.name,
      email: data.email,
      role: 'instructor',
      xp: 25000,
      streak: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      avatar: initials,
      tracksEnrolled: [data.initialTrack],
      challengesCompleted: 50,
      specialization: data.specialization,
    };

    const newInst: InstructorItem = {
      id: newId,
      name: data.name,
      email: data.email,
      tracksCount: 1,
      challengesCount: 0,
      activeStudents: 0,
      rating: 5.0,
      status: 'active',
      specializations: [data.specialization],
      joinedAt: new Date().toISOString().split('T')[0],
      avatar: initials,
    };

    const updatedUsers = [newUser, ...users];
    const updatedInsts = [newInst, ...instructors];

    setUsers(updatedUsers);
    setInstructors(updatedInsts);

    try {
      localStorage.setItem('nexus_admin_users', JSON.stringify(updatedUsers));
      localStorage.setItem('nexus_admin_instructors', JSON.stringify(updatedInsts));
    } catch {}

    addAuditLog('INSTRUCTOR_ONBOARDED', `${data.name} (${data.email})`, 'info', `Atribuído à trilha ${data.initialTrack}`);
    showToast(`Instrutor Lead ${data.name} cadastrado com sucesso!`);
  };

  const handleAssignTrack = (instructorId: string, trackName: string) => {
    const updated = instructors.map((inst) =>
      inst.id === instructorId
        ? {
            ...inst,
            tracksCount: inst.tracksCount + 1,
            specializations: [...inst.specializations, trackName],
          }
        : inst
    );
    setInstructors(updated);
    try {
      localStorage.setItem('nexus_admin_instructors', JSON.stringify(updated));
    } catch {}
    const inst = instructors.find((i) => i.id === instructorId);
    addAuditLog('TRACK_ASSIGNED', `${trackName} -> ${inst?.name}`, 'info');
    showToast(`Trilha "${trackName}" designada com sucesso.`);
  };

  const handleCreateChallenge = (
    courseId: string,
    challengeData: Omit<AdminChallengeItem, 'id' | 'activeSubmissions' | 'passRate'>
  ) => {
    const newChallenge: AdminChallengeItem = {
      ...challengeData,
      id: `ch-${Date.now().toString().slice(-4)}`,
      activeSubmissions: 0,
      passRate: 100,
    };

    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
        return {
          ...c,
          totalChallenges: c.totalChallenges + 1,
          challenges: [newChallenge, ...c.challenges],
        };
      }
      return c;
    });

    setCourses(updatedCourses);
    try {
      localStorage.setItem('nexus_admin_courses', JSON.stringify(updatedCourses));
    } catch {}

    addAuditLog(
      'CHALLENGE_CREATED',
      `${newChallenge.title} (${newChallenge.language.toUpperCase()})`,
      'info',
      `Limites: ${newChallenge.cpuLimitMs}ms CPU, ${newChallenge.ramLimitMb}MB RAM, ${newChallenge.hiddenTestsCount} testes ocultos`
    );
    showToast(`Desafio "${newChallenge.title}" publicado na Sandbox!`);
  };

  const handleToggleCourseStatus = (courseId: string, newStatus: CourseStatus) => {
    const updated = courses.map((c) => (c.id === courseId ? { ...c, status: newStatus } : c));
    setCourses(updated);
    try {
      localStorage.setItem('nexus_admin_courses', JSON.stringify(updated));
    } catch {}
    const course = courses.find((c) => c.id === courseId);
    addAuditLog('COURSE_STATUS_CHANGED', `${course?.title} -> ${newStatus.toUpperCase()}`, 'info');
    showToast(`Status do curso alterado para ${newStatus}.`);
  };

  const handleToggleCertificateStatus = (certId: string) => {
    const updated = certificates.map((cert) => {
      if (cert.id === certId) {
        const nextStatus = cert.status === 'valid' ? 'revoked' : 'valid';
        addAuditLog(
          nextStatus === 'revoked' ? 'CERTIFICATE_REVOKED' : 'CERTIFICATE_REVALIDATED',
          `${cert.certificateCode} (${cert.studentName})`,
          nextStatus === 'revoked' ? 'warn' : 'info'
        );
        return { ...cert, status: nextStatus as 'valid' | 'revoked' };
      }
      return cert;
    });
    setCertificates(updated);
    try {
      localStorage.setItem('nexus_admin_certs', JSON.stringify(updated));
    } catch {}
    showToast('Status do certificado atualizado.');
  };

  // SRE actions
  const handleRecyclePool = () => {
    setMetrics((prev) => ({ ...prev, pistonLatencyMs: 38 }));
    addAuditLog('CONTAINER_POOL_RECYCLED', 'Piston Engine Cluster (32 VMs)', 'info', 'Zero-downtime micro-VM pool recycled');
    showToast('Pool de 32 micro-VMs Piston reciclado com sucesso.');
  };

  const handlePurgeCache = () => {
    addAuditLog('BUILD_CACHE_PURGED', 'Rustc, Go & Solidity AST Cache', 'info', '6.4 GB de cache liberados.');
    showToast('Cache de compilação purgado com sucesso.');
  };

  const handleRunBenchmark = () => {
    addAuditLog('SRE_BENCHMARK_EXECUTED', 'Piston Micro-VMs Stress (500 jobs)', 'info', 'P50: 39ms | P99: 114ms | 0 erros.');
    showToast('Benchmark concluído: P50=39ms, P99=114ms.');
  };

  const criticalLogsCount = auditLogs.filter((l) => l.severity === 'critical').length;
  const currentUser = users[0] || INITIAL_ADMIN_USERS[0];

  return (
    <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex antialiased selection:bg-[#8257E5] selection:text-white">
      {/* 1. Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        usersCount={users.length}
        coursesCount={courses.length}
        instructorsCount={instructors.length}
        criticalLogsCount={criticalLogsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 lg:ml-64 xl:ml-72 flex flex-col min-w-0">
        {/* Topbar */}
        <AdminTopbar
          currentUser={currentUser}
          metrics={metrics}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickAction={(action) => {
            if (action === 'flush_pool') handleRecyclePool();
          }}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {currentTab === 'overview' && (
            <AdminOverviewTab
              metrics={metrics}
              recentLogs={auditLogs}
              onNavigateTab={setCurrentTab}
              onQuickAction={(action) => {
                if (action === 'flush_pool') handleRecyclePool();
              }}
            />
          )}

          {currentTab === 'users' && (
            <AdminUsersTab
              users={users}
              onPromoteUser={handlePromoteUser}
              onToggleUserStatus={handleToggleUserStatus}
              onCreateInstructor={handleCreateInstructor}
              onAdjustXp={handleAdjustXp}
            />
          )}

          {currentTab === 'instructors' && (
            <AdminInstructorsTab
              instructors={instructors}
              onOpenCreateModal={() => setCurrentTab('users')}
              onAssignTrack={handleAssignTrack}
            />
          )}

          {currentTab === 'courses' && (
            <AdminCoursesTab
              courses={courses}
              onCreateChallenge={handleCreateChallenge}
              onToggleCourseStatus={handleToggleCourseStatus}
            />
          )}

          {currentTab === 'system' && (
            <AdminSystemHealthTab
              metrics={metrics}
              nodes={nodes}
              onRecyclePool={handleRecyclePool}
              onPurgeCache={handlePurgeCache}
              onRunBenchmark={handleRunBenchmark}
            />
          )}

          {currentTab === 'audit' && (
            <AdminAuditLogsTab
              logs={auditLogs}
              certificates={certificates}
              onToggleCertificateStatus={handleToggleCertificateStatus}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#121217] border border-[#8257E5] text-white text-xs font-semibold shadow-[0_0_25px_rgba(130,87,229,0.35)] flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-[#04D361] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
