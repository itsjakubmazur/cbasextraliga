const AdminApi = {
  async call(path, options = {}) {
    const res = await fetch(path, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      // no body
    }
    if (!res.ok) {
      const err = new Error((json && json.error) || `Požadavek selhal (${res.status})`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  },

  status() {
    return this.call('/api/auth/status');
  },
  login(password) {
    return this.call('/api/auth/login', { method: 'POST', body: { password } });
  },
  logout() {
    return this.call('/api/auth/logout', { method: 'POST' });
  },
  currentData() {
    return this.call('/api/current-data');
  },
  syncFetch(competitionKey) {
    return this.call('/api/sync/fetch', { method: 'POST', body: { competitionKey } });
  },
  discoverCompetitions(tournamentId) {
    return this.call(`/api/sync/discover-competitions?tournamentId=${encodeURIComponent(tournamentId)}`);
  },
  publish(data, message) {
    return this.call('/api/publish', { method: 'POST', body: { data, message } });
  },
};
