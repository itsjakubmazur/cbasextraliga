const AdminSync = {
  lastRows: [],
  lastCompetitionKey: null,
  lastWarningsById: new Map(),

  // Parovani zapasu a sjednoceni nazvu tymu je ve sdilenem js/sync-merge.js
  // (stejna logika jako automaticky sync). Tym nalezeny jinde v datech
  // (historie, alias) se nehlasi jako neznamy - pri "Pouzit vybrane" se
  // doplni do tymu souteze.
  lastTeamsToAdd: new Map(),

  async runSync(competitionKey) {
    const statusEl = document.getElementById('syncStatus');
    statusEl.textContent = 'Stahuji z czechbadminton.cz…';
    document.getElementById('syncFetchBtn').disabled = true;

    try {
      const result = await AdminApi.syncFetch(competitionKey);
      // tournamentConfig.json uz muze mit ID nove sezony, zatimco koncept je
      // jeste ve stare - zapasy by se jinak tise namichaly do spatneho rocniku.
      if (result.sezona && SyncMerge.seasonKey(result.sezona) !== SyncMerge.seasonKey(AdminData.draft.rocnik)) {
        statusEl.textContent = `❌ Sync je nastavený na sezónu ${result.sezona}, ale koncept je ${AdminData.draft.rocnik || '(bez ročníku)'}. Nejdřív založ novou sezónu.`;
        return;
      }
      this.lastCompetitionKey = competitionKey;
      this.lastWarningsById = new Map(result.warnings.map((w) => [w.id, [...w.issues]]));
      this.lastTeamsToAdd = new Map();

      const known = AdminData.draft.tymy[competitionKey] || [];
      const everywhere = SyncMerge.knownTeamsEverywhere(AdminData.draft);
      const reconcile = (apiName) => SyncMerge.reconcileTeamName(known, everywhere, apiName, result.teamAliases);

      result.candidates.forEach((c) => {
        const issues = this.lastWarningsById.get(c.id) || [];
        const toAdd = [];
        ['tymDomaci', 'tymHoste'].forEach((field) => {
          const rec = reconcile(c[field]);
          c[field] = rec.name;
          if (!rec.matched) issues.push(`Neznámý tým: "${rec.name}" (zkontroluj, jestli nejde o nový tým)`);
          else if (rec.source === 'jinde') toAdd.push(rec.name);
        });
        if (issues.length) this.lastWarningsById.set(c.id, issues);
        this.lastTeamsToAdd.set(c.id, toAdd);
      });

      this.lastRows = SyncMerge.computeDiff(AdminData.getZapasy(competitionKey), result.candidates);
      this.lastRows.forEach((row) => {
        if (!row.issues) return;
        this.lastWarningsById.set(row.warningsKey, [...(this.lastWarningsById.get(row.warningsKey) || []), ...row.issues]);
      });

      // Loga se z API vraci pod syrovym nazvem tymu (napr. "BK METEOR PRAHA")
      // - ulozi se jen pro tymy, ktere v datech opravdu jsou.
      const reconciledLogos = {};
      Object.entries(result.teamLogos || {}).forEach(([apiName, url]) => {
        const rec = reconcile(apiName);
        if (rec.matched) reconciledLogos[rec.name] = url;
      });
      AdminData.mergeTymLoga(reconciledLogos);
      const pending = result.pendingCount || 0;
      statusEl.textContent = `Staženo ${result.matchCount} utkání z czechbadminton.cz` +
        (pending ? ` (z toho ${pending} čeká na schválení - zapíšou se s označením „neschváleno“).` : '.');
      this.render();
    } catch (err) {
      statusEl.textContent = '❌ ' + err.message;
    } finally {
      document.getElementById('syncFetchBtn').disabled = false;
    }
  },

  render() {
    const tbody = document.getElementById('syncDiffBody');
    tbody.innerHTML = '';

    const visible = this.lastRows.filter((r) => r.status !== 'unchanged');
    const unchangedCount = this.lastRows.length - visible.length;

    document.getElementById('syncSummary').textContent =
      `Nové: ${visible.filter((r) => r.status === 'new').length} · ` +
      `Změněné: ${visible.filter((r) => r.status === 'changed').length} · ` +
      `Zmizelé: ${visible.filter((r) => r.status === 'removed').length} · ` +
      `Beze změny (skryto): ${unchangedCount}`;

    if (visible.length === 0) {
      document.getElementById('syncDiffContainer').style.display = 'none';
      return;
    }
    document.getElementById('syncDiffContainer').style.display = 'block';

    const badgeText = { new: 'Nové', changed: 'Změněno', removed: 'Zmizelo' };

    visible.forEach((row, idx) => {
      const z = row.candidate || row.current;
      const warnings = this.lastWarningsById.get(row.warningsKey) || [];
      const defaultChecked = row.status !== 'removed' && warnings.length === 0;

      const tr = document.createElement('tr');
      tr.className = `diff-row row-${row.status}`;

      const diffCell = (field, label) => {
        if (row.status === 'changed' && row.current[field] !== row.candidate[field]) {
          return `<div><span class="diff-old">${row.current[field] || '—'}</span><br><span class="diff-new">${row.candidate[field]}</span></div>`;
        }
        return `<span>${z[field] || ''}</span>`;
      };

      tr.innerHTML =
        `<td><input type="checkbox" class="checkbox" data-idx="${idx}" ${defaultChecked ? 'checked' : ''}></td>` +
        `<td><span class="status-chip status-${row.status}">${badgeText[row.status]}</span>` +
        (warnings.length ? `<div class="warning-note">⚠ ${warnings.join('; ')}</div>` : '') +
        `</td>` +
        `<td class="mono">${z.kolo}</td>` +
        `<td class="mono">${diffCell('datum')}</td>` +
        `<td>${z.tymDomaci} – ${z.tymHoste}</td>` +
        `<td>${diffCell('disciplina')}</td>` +
        `<td>${diffCell('domaci')} vs ${diffCell('hoste')}</td>` +
        `<td class="mono">${diffCell('vysledek')}</td>` +
        `<td class="mono" style="font-size:0.75rem;">${diffCell('sety')}</td>`;

      tbody.appendChild(tr);
    });

    this._visibleRows = visible;
  },

  applySelected() {
    if (!this._visibleRows) return;
    const checkboxes = document.querySelectorAll('#syncDiffBody input[type=checkbox]');
    let applied = 0;
    checkboxes.forEach((cb) => {
      if (!cb.checked) return;
      const row = this._visibleRows[Number(cb.dataset.idx)];
      if (row.status === 'removed') {
        AdminData.removeZapas(this.lastCompetitionKey, row.id);
      } else {
        (this.lastTeamsToAdd.get(row.warningsKey) || []).forEach((t) => AdminData.addTym(this.lastCompetitionKey, t));
        AdminData.upsertZapas(this.lastCompetitionKey, row.candidate);
      }
      applied++;
    });
    document.getElementById('syncStatus').textContent = `✓ Aplikováno ${applied} změn do konceptu. Nezapomeň publikovat.`;
    AdminPublish.refreshSummary();
    this.lastRows = [];
    document.getElementById('syncDiffContainer').style.display = 'none';
  },

  toggleAll(checked) {
    document.querySelectorAll('#syncDiffBody input[type=checkbox]').forEach((cb) => {
      cb.checked = checked;
    });
  },
};
