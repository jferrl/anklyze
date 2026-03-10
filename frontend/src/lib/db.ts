import Dexie, { type EntityTable } from 'dexie';

// Form draft stored in IndexedDB
export interface FormDraft {
  id: string;
  formType: 'fracture' | 'case' | 'study';
  data: Record<string, unknown>;
  history: Record<string, unknown>[];
  timestamp: number;
  expiresAt: number;
}

// Define the database
const db = new Dexie('AnklyzeDB') as Dexie & {
  formDrafts: EntityTable<FormDraft, 'id'>;
};

// Version 2: removed classificationCache table
db.version(2).stores({
  formDrafts: 'id, formType, timestamp, expiresAt',
  classificationCache: null,
});

export { db };
