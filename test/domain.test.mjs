import { describe, expect, it } from 'vitest';
import { createSemanticRegistry, GovernanceError } from '../domain.mjs';

const architect = { id: 'u-architect', role: 'semantic-architect' };
const reviewer = { id: 'u-reviewer', role: 'data-governor' };
const operator = { id: 'u-operator', role: 'collection-operator' };
const input = { id: 'SEM-340', supplier: 'Aster Supply Group', className: 'SupplierDocument', properties: ['supplierId', 'category'], retentionDays: 120 };
const codeOf = task => { try { task(); } catch (error) { return error.code; } };
describe('semantic collection governance', () => {
  it('defines, reviews, deploys, and audits a semantic collection', () => { const registry = createSemanticRegistry(); expect(registry.define(architect, input).state).toBe('draft'); expect(registry.review(reviewer, input.id, 'The schema review confirms supplier data boundaries and semantic relevance controls.').state).toBe('approved'); expect(registry.deploy(operator, input.id).state).toBe('deployed'); expect(registry.audit()).toHaveLength(3); });
  it('rejects invalid definition input and duplicate policies', () => { const registry = createSemanticRegistry(); expect(codeOf(() => registry.define(architect, { ...input, id: 'bad', properties: [] }))).toBe('VALIDATION'); registry.define(architect, input); expect(codeOf(() => registry.define(architect, input))).toBe('CONFLICT'); });
  it('enforces authorization, policy existence, and review prerequisites', () => { const registry = createSemanticRegistry(); registry.define(architect, input); expect(codeOf(() => registry.review(architect, input.id, 'This evidence would otherwise be adequate for a review decision.'))).toBe('FORBIDDEN'); expect(codeOf(() => registry.review(reviewer, 'SEM-404', 'This evidence would otherwise be adequate for a review decision.'))).toBe('NOT_FOUND'); expect(codeOf(() => registry.deploy(operator, input.id))).toBe('CONFLICT'); expect(codeOf(() => registry.review(reviewer, input.id, 'short'))).toBe('VALIDATION'); });
});
