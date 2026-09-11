import { CryptographicAuditRecord } from './types';

export const SAMPLE_AUDIT_RECORDS: Record<string, CryptographicAuditRecord> = {
  'nx-8f92a4e1b8c6': {
    hash: 'SHA256:8f92a4e1b8c6d3f01a7e5b2c9d4e6f8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    blockHeight: 1849204,
    timestamp: '2026-03-05T18:42:19Z',
    merkleRoot: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    validatorNode: 'validator-node-04.sa-east.nexuscode.network',
    signatureAlg: 'ED25519-SHA512 with Quantum-Resistant Merkle Tree',
    status: 'valid',
    student: {
      name: 'Augusto Galvão',
      handle: 'augusto-nexus',
      avatarInitials: 'AG',
      profileUrl: '/profile',
    },
    course: {
      title: 'Sistemas Distribuídos & Concorrência em Rust',
      slug: 'distributed-systems-rust',
      hours: 64,
      challengesSolved: 36,
      commitsAudited: 142,
      finalScorePercent: 98.6,
      issuedDate: '05 de Março de 2026',
    },
    skills: [
      {
        name: 'Raft Consensus Protocol',
        category: 'Sistemas Distribuídos',
        proficiencyLevel: 'Mastery',
        score: 99,
      },
      {
        name: 'Lock-free Atomics & Ring Buffers',
        category: 'Concorrência Rust',
        proficiencyLevel: 'Mastery',
        score: 98,
      },
      {
        name: 'Write-Ahead Log (WAL) & LSM-Trees',
        category: 'Storage Engines',
        proficiencyLevel: 'Advanced',
        score: 97,
      },
      {
        name: 'Zero-Copy Slices & Memory Safety',
        category: 'Rust Core Internals',
        proficiencyLevel: 'Mastery',
        score: 100,
      },
      {
        name: 'gRPC Bidirecional com Tonic & Tokio',
        category: 'Networking & RPC',
        proficiencyLevel: 'Advanced',
        score: 96,
      },
    ],
  },
};

export function getAuditRecordByHash(hash: string): CryptographicAuditRecord {
  const normalized = hash ? hash.toLowerCase().trim() : '';

  if (SAMPLE_AUDIT_RECORDS[normalized]) {
    return SAMPLE_AUDIT_RECORDS[normalized];
  }

  // Generate dynamic audit record for any input hash
  const displayHash = normalized.startsWith('sha256:')
    ? normalized.toUpperCase()
    : `SHA256:${normalized.padEnd(32, 'a')}${Math.random().toString(36).substring(2, 10)}`;

  return {
    hash: displayHash,
    blockHeight: 1849000 + Math.floor(Math.random() * 5000),
    timestamp: new Date().toISOString(),
    merkleRoot: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    validatorNode: 'validator-node-01.us-east.nexuscode.network',
    signatureAlg: 'ED25519-SHA512 with Quantum-Resistant Merkle Tree',
    status: 'valid',
    student: {
      name: 'Augusto Galvão',
      handle: 'augusto-nexus',
      avatarInitials: 'AG',
      profileUrl: '/profile',
    },
    course: {
      title: 'Fullstack Next.js 14 & Cloud Architecture',
      slug: 'fullstack',
      hours: 48,
      challengesSolved: 24,
      commitsAudited: 98,
      finalScorePercent: 99.2,
      issuedDate: '01 de Março de 2026',
    },
    skills: [
      {
        name: 'Next.js 14 App Router & Server Components',
        category: 'Frontend Architecture',
        proficiencyLevel: 'Mastery',
        score: 100,
      },
      {
        name: 'PostgreSQL Relational Modeling & Prisma',
        category: 'Database & ORM',
        proficiencyLevel: 'Mastery',
        score: 98,
      },
      {
        name: 'Atomic Caching & Invalidation with Redis',
        category: 'Distributed Systems',
        proficiencyLevel: 'Advanced',
        score: 97,
      },
      {
        name: 'Automated CI/CD & Piston Sandbox Isolation',
        category: 'DevOps & Tooling',
        proficiencyLevel: 'Mastery',
        score: 99,
      },
    ],
  };
}
