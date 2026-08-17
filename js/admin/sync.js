const AdminSync = {
  lastRows: [],
  lastCompetitionKey: null,
  lastWarningsById: new Map(),

  // API vraci nazvy tymu casto v jine velikosti pismen/mezerach nez uz mame
  // ulozene (napr. "B.O.CHANCE OSTRAVA SPORTCLUB" vs "B.O. Chance Ostrava
  // Sportclub"). Pokud jde jen o takovouhle drobnost, pouzije se uz zavedeny
  // nazev z draftu, at nevznikaji tise "dva ruzne" tymy. Pokud tym vubec
  // neznáme (napr. novy postoupivsi tym), vrati se beze zmeny + matched:false,
  // aby to sync oznacil k rucni kontrole a nic se nedohadovalo samo.
  reconcileTeamName(soutez, apiName) {
    const known = AdminData.draft.tymy[soutez] || [];
    if (known.includes(apiName)) return { name: apiName, matched: true };
    const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const match = known.find((t) => norm(t) === norm(apiName));
    if (match) return { name: match, matched: true };
    return { name: apiName, matched: false };
  },

  computeDiff(soutez, candidates) {
    const currentById = new Map(AdminData.getZapasy(soutez).map((z) => [z.id, z]));
    const candidateIds = new Set(candidates.map((c) => c.id));
    const rows = [];

    candidates.forEach((c) => {
      const old = currentById.get(c.id);
      if (!old) rows.push({ status: 'new', id: c.id, candidate: c, current: null });
      else if (JSON.stringify(old) !== JSON.stringify(c)) rows.push({ status: 'changed', id: c.id, candidate: c, current: old });
      else rows.push({ status: 'unchanged', id: c.id, candidate: c, current: old });
    });

    // zapasy, ktere drive prisly ze syncu (id "api:...") a API uz je nevraci
    // (napr. prestaly byt schvalene) - nikdy se nesmaze automaticky
    currentById.forEach((z, id) => {
      if (String(id).startsWith('api:') && !candidateIds.has(id)) {
        rows.push({ status: 'removed', id, candidate: null, current: z });
      }
    });

    return rows;
  },

  async runSync(competitionKey) {
    const statusEl = document.getElementById('syncStatus');
    statusEl.textContent = 'Stahuji z czechbadminton.cz…';
    document.getElementById('syncFetchBtn').disabled = true;

    try {
      const result = await AdminApi.syncFetch(competitionKey);
      this.lastCompetitionKey = competitionKey;
      this.lastWarningsById = new Map(result.warnings.map((w) => [w.id, [...w.issues]]));

      // Sjednoceni nazvu tymu podle uz zavedeneho seznamu (viz reconcileTeamName)
      result.candidates.forEach((c) => {
        const home = this.reconcileTeamName(competitionKey, c.tymDomaci);
        const away = this.reconcileTeamName(competitionKey, c.tymHoste);
        c.tymDomaci = home.name;
        c.tymHoste = away.name;
        if (!home.matched || !away.matched) {
          const issues = this.lastWarningsById.get(c.id) || [];
          if (!home.matched) issues.push(`Neznámý tým: "${home.name}" (zkontroluj, jestli nejde o nový tým)`);
          if (!away.matched) issues.push(`Neznámý tým: "${away.name}" (zkontroluj, jestli nejde o nový tým)`);
          this.lastWarningsById.set(c.id, issues);
        }
      });

      this.lastRows = this.computeDiff(competitionKey, result.candidates);
      AdminData.mergeTymLoga(result.teamLogos);
      statusEl.textContent = `Staženo ${result.matchCount} schválených zápasů z czechbadminton.cz.`;
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

    const badgeClass = { new: 'bg-green-100 text-green-800', changed: 'bg-yellow-100 text-yellow-800', removed: 'bg-red-100 text-red-800' };
    const badgeText = { new: 'Nové', changed: 'Změněno', removed: 'Zmizelo' };

    visible.forEach((row, idx) => {
      const z = row.candidate || row.current;
      const warnings = this.lastWarningsById.get(row.id) || [];
      const defaultChecked = row.status !== 'removed' && warnings.length === 0;

      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-200 align-top';

      const diffCell = (field, label) => {
        if (row.status === 'changed' && row.current[field] !== row.candidate[field]) {
          return `<div class="text-xs"><span class="line-through text-gray-400">${row.current[field]}</span><br><span class="font-semibold text-gray-900">${row.candidate[field]}</span></div>`;
        }
        return `<span>${z[field] || ''}</span>`;
      };

      tr.innerHTML =
        `<td class="p-2"><input type="checkbox" data-idx="${idx}" ${defaultChecked ? 'checked' : ''}></td>` +
        `<td class="p-2"><span class="text-xs px-2 py-0.5 rounded-full ${badgeClass[row.status]}">${badgeText[row.status]}</span>` +
        (warnings.length ? `<div class="text-xs text-red-600 mt-1">⚠️ ${warnings.join('; ')}</div>` : '') +
        `</td>` +
        `<td class="p-2 text-sm">${z.kolo}</td>` +
        `<td class="p-2 text-sm">${z.tymDomaci} – ${z.tymHoste}</td>` +
        `<td class="p-2 text-sm">${diffCell('disciplina')}</td>` +
        `<td class="p-2 text-sm">${diffCell('domaci')} vs ${diffCell('hoste')}</td>` +
        `<td class="p-2 text-sm">${diffCell('vysledek')}</td>` +
        `<td class="p-2 text-xs">${diffCell('sety')}</td>`;

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
