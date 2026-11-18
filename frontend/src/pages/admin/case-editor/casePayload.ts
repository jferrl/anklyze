import type { UpdateCaseRequest } from '@/types';

interface CaseUpdateInput {
  title: string;
  description: string;
  deadline: string; // yyyy-mm-dd, empty when cleared
  canEdit: boolean; // draft: title is editable
  canEditAlways: boolean; // not closed: description and deadline are editable
}

// Sends only fields the case status allows (the backend rejects the rest).
// An emptied deadline is null so the backend clears it; undefined would mean "unchanged".
export function buildCaseUpdatePayload(i: CaseUpdateInput): UpdateCaseRequest {
  const data: UpdateCaseRequest = {};
  if (i.canEdit) data.title = i.title.trim();
  if (i.canEditAlways) {
    data.description = i.description.trim();
    data.deadline = i.deadline ? new Date(i.deadline).toISOString() : null;
  }
  return data;
}
