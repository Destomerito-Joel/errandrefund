/** Recognize the HTTP error shapes emitted by ofetch and the admin API's 401 body. */
export function isUnauthorizedError(error) {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error;
  if ([candidate.status, candidate.statusCode, candidate.response?.status].includes(401)) return true;
  return candidate.data?.error === 'A valid admin bearer token is required';
}

/** Invoke the store's key/state cleanup callback when an admin request is unauthorized. */
export function clearAdminKeyOnUnauthorized(error, clearAdminKey) {
  if (!isUnauthorizedError(error)) return false;
  clearAdminKey();
  return true;
}
