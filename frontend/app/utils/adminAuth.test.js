import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clearAdminKeyOnUnauthorized, isUnauthorizedError } from './adminAuth.js';

describe('isUnauthorizedError', () => {
  it('detects HTTP 401 from common ofetch error shapes and the API body', () => {
    for (const error of [
      { status: 401 },
      { statusCode: 401 },
      { response: { status: 401 } },
      { data: { error: 'A valid admin bearer token is required' } },
    ]) assert.equal(isUnauthorizedError(error), true);
  });

  it('does not classify unrelated errors as unauthorized', () => {
    for (const error of [
      { status: 403 },
      { statusCode: 500 },
      new Error('Network unavailable'),
      { data: { error: 'Refund request not found' } },
      null,
    ]) assert.equal(isUnauthorizedError(error), false);
  });

  it('clears the stored admin key through the store callback on 401', () => {
    const storage = new Map([['errand-admin-api-key', 'test-key']]);
    const forgetAdminKey = () => storage.delete('errand-admin-api-key');

    assert.equal(clearAdminKeyOnUnauthorized({ statusCode: 401 }, forgetAdminKey), true);
    assert.equal(storage.has('errand-admin-api-key'), false);
  });

  it('does not clear the stored admin key for unrelated failures', () => {
    const storage = new Map([['errand-admin-api-key', 'test-key']]);
    const forgetAdminKey = () => storage.delete('errand-admin-api-key');

    assert.equal(clearAdminKeyOnUnauthorized({ status: 500 }, forgetAdminKey), false);
    assert.equal(storage.has('errand-admin-api-key'), true);
  });
});
