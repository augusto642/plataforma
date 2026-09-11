export interface ValidatedSkill {
  name: string;
  category: string;
  proficiencyLevel: 'Mastery' | 'Advanced' | 'Proficient';
  score: number; // e.g. 98%
}

export interface CryptographicAuditRecord {
  hash: string;
  blockHeight: number;
  timestamp: string;
  merkleRoot: string;
  validatorNode: string;
  signatureAlg: string;
  status: 'valid' | 'invalid' | 'revoked';
  student: {
    name: string;
    handle: string;
    avatarInitials: string;
    profileUrl: string;
  };
  course: {
    title: string;
    slug: string;
    hours: number;
    challengesSolved: number;
    commitsAudited: number;
    finalScorePercent: number;
    issuedDate: string;
  };
  skills: ValidatedSkill[];
}
