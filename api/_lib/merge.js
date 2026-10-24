// Node vstup do sdilene logiky slucovani (js/sync-merge.js) s aliasy tymu
// z teamAliases.json - pouziva scripts/auto-sync.js.
const SyncMerge = require('../../js/sync-merge');
const teamAliases = require('./teamAliases.json');

function reconcileTeamName(known, everywhere, apiName) {
  return SyncMerge.reconcileTeamName(known, everywhere, apiName, teamAliases);
}

module.exports = { ...SyncMerge, reconcileTeamName };
