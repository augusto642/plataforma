import type { Metadata } from 'next';
import StudentDashboard from './student-dashboard';

export const metadata: Metadata = {
  title: 'Painel do aluno — Prévia | Nexus Code',
  robots: { index: false, follow: false },
};

export default function DashboardPrototypePage() {
  return <StudentDashboard />;
}
