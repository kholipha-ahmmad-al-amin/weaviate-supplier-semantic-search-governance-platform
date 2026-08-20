export class GovernanceError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const roles = { architect: 'semantic-architect', reviewer: 'data-governor', operator: 'collection-operator' };
const permitted = (role, expected) => {
  if (role !== expected) throw new GovernanceError('FORBIDDEN', 'The caller is not authorized for this transition.');
};

export function createSemanticRegistry() {
  const collections = new Map();
  const audit = [];
  const record = (action, collectionId, actor, detail) => audit.push({ id: `AUD-${audit.length + 1}`, action, collectionId, actor, detail, at: new Date().toISOString() });
  const get = id => {
    const value = collections.get(id);
    if (!value) throw new GovernanceError('NOT_FOUND', 'The semantic collection policy was not found.');
    return value;
  };
  return {
    define(actor, input) {
      permitted(actor.role, roles.architect);
      if (!/^SEM-[A-Z0-9]{3,}$/.test(input.id || '') || !input.supplier || input.supplier.trim().length < 3 || !input.className || !Array.isArray(input.properties) || input.properties.length === 0) throw new GovernanceError('VALIDATION', 'A valid identifier, supplier, class, and schema properties are required.');
      if (collections.has(input.id)) throw new GovernanceError('CONFLICT', 'The semantic collection policy already exists.');
      const policy = { id: input.id, supplier: input.supplier.trim(), className: input.className, properties: [...input.properties], retentionDays: Number(input.retentionDays || 90), state: 'draft', review: null };
      collections.set(policy.id, policy); record('collection.defined', policy.id, actor.id, { className: policy.className }); return { ...policy };
    },
    review(actor, id, evidence) {
      permitted(actor.role, roles.reviewer); const policy = get(id);
      if (policy.state !== 'draft') throw new GovernanceError('CONFLICT', 'Only draft collections can be reviewed.');
      if (!evidence || evidence.trim().length < 20) throw new GovernanceError('VALIDATION', 'Review evidence must contain at least 20 characters.');
      policy.state = 'approved'; policy.review = { by: actor.id, evidence: evidence.trim() }; record('collection.reviewed', id, actor.id, { outcome: 'approved' }); return { ...policy };
    },
    deploy(actor, id) {
      permitted(actor.role, roles.operator); const policy = get(id);
      if (policy.state !== 'approved') throw new GovernanceError('CONFLICT', 'The semantic collection requires approved review before deployment.');
      policy.state = 'deployed'; record('collection.deployed', id, actor.id, { retentionDays: policy.retentionDays }); return { ...policy };
    },
    get: id => ({ ...get(id) }),
    audit: () => audit.map(event => ({ ...event })),
    count: () => collections.size
  };
}
