import express from 'express';
import { createSemanticRegistry, GovernanceError } from './domain.mjs';

const registry = createSemanticRegistry();
const app = express(); app.use(express.json());
const actor = request => ({ id: request.header('x-actor-id') || 'anonymous', role: request.header('x-role') || 'anonymous' });
const respond = (res, fn) => { try { return res.status(200).json(fn()); } catch (error) { const status = error instanceof GovernanceError ? ({ VALIDATION: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 }[error.code] || 500) : 500; return res.status(status).json({ error: error.code || 'INTERNAL_ERROR', message: error.message }); } };
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'weaviate-supplier-semantic-search-governance', collections: registry.count() }));
app.post('/collections', (req, res) => respond(res, () => registry.define(actor(req), req.body)));
app.post('/collections/:id/review', (req, res) => respond(res, () => registry.review(actor(req), req.params.id, req.body.evidence)));
app.post('/collections/:id/deploy', (req, res) => respond(res, () => registry.deploy(actor(req), req.params.id)));
app.get('/collections/:id', (req, res) => respond(res, () => registry.get(req.params.id)));
app.get('/audit-events', (_, res) => res.json({ events: registry.audit() }));
app.listen(Number(process.env.SEMANTIC_PORT || 23400), '0.0.0.0', () => console.log('semantic governance service ready'));
