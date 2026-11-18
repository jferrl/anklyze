import { describe, it, expect } from 'vitest';
import { buildCaseUpdatePayload } from './casePayload';

const base = { title: ' T ', description: ' D ', deadline: '2030-01-02', canEdit: true, canEditAlways: true };

describe('buildCaseUpdatePayload', () => {
  it('draft sends all fields', () => {
    expect(buildCaseUpdatePayload(base)).toEqual({
      title: 'T', description: 'D', deadline: '2030-01-02T00:00:00.000Z',
    });
  });

  it('emptied deadline is explicit null, not omitted', () => {
    const body = JSON.parse(JSON.stringify(buildCaseUpdatePayload({ ...base, deadline: '' })));
    expect(body.deadline).toBeNull();
  });

  it('emptied description is sent as empty string', () => {
    expect(buildCaseUpdatePayload({ ...base, description: '' }).description).toBe('');
  });

  it('published omits title', () => {
    expect(buildCaseUpdatePayload({ ...base, canEdit: false })).not.toHaveProperty('title');
  });

  it('closed sends nothing', () => {
    expect(buildCaseUpdatePayload({ ...base, canEdit: false, canEditAlways: false })).toEqual({});
  });
});
