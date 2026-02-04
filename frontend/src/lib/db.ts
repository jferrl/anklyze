import Dexie, { type EntityTable } from 'dexie';
import type { ClassificationResult as ClassificationResultType } from '@/types';

// Form draft stored in IndexedDB
export interface FormDraft {
  id: string;
  formType: 'fracture' | 'case' | 'study';
  data: Record<string, unknown>;
  history: Record<string, unknown>[];
  timestamp: number;
  expiresAt: number;
}

// Classification result cache stored in IndexedDB
export interface ClassificationCache {
  id: string;
  input: string; // JSON stringified input for indexing
  result: ClassificationResultType;
  timestamp: number;
  expiresAt: number;
}

// Define the database
const db = new Dexie('AnklyzeDB') as Dexie & {
  formDrafts: EntityTable<FormDraft, 'id'>;
  classificationCache: EntityTable<ClassificationCache, 'id'>;
};

// Define schema version 1
db.version(1).stores({
  formDrafts: 'id, formType, timestamp, expiresAt',
  classificationCache: 'id, input, timestamp, expiresAt',
});

export { db };
