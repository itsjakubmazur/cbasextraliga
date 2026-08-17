const SOUTEZ_NAZVY = {
  extraliga: 'Extraliga',
  'prvni-liga-vychod': '1. liga – Východ',
  'prvni-liga-zapad': '1. liga – Západ',
  'prvni-liga-playoff': '1. liga – Play-off',
  baraze: 'Baráž',
};

const DISCIPLINY = ['Dvouhra mužů', 'Dvouhra žen', 'Čtyřhra mužů', 'Čtyřhra žen', 'Smíšená čtyřhra'];

const AdminManage = {
  editingId: null,

  populateCompetitionSelects() {
    document.querySelectorAll('.js-soutez-select').forEach((sel) => {
      sel.innerHTML = SOUTEZE.map((s) => `<option value="${s}">${SOUTEZ_NAZVY[s]}</option>`).join('');
    });
  },

  populateDisciplinySelect() {
    const sel = document.getElementById('manageDisciplina');
    sel.innerHTML = DISCIPLINY.map((d) => `<option value="${d}">${d}</option>`).join('');
  },

  populateTeamSelects(soutez) {
    const tymy = AdminData.draft.tymy[soutez] || [];
    ['manageTymDomaci', 'manageTymHoste'].forEach((id) => {
      const sel = document.getElementById(id);
      const prev = sel.value;
      sel.innerHTML = '<option value="">— tým —</option>' + tymy.map((t) => `<option value="${t}">${t}</option>`).join('');
      if (tymy.includes(prev)) sel.value = prev;
    });
  },

  onCompetitionChange() {
    const soutez = document.getElementById('manageCompetition').value;
    this.populateTeamSelects(soutez);
    this.renderTeamList(soutez);
    this.renderMatchList(soutez);
  },

  resetForm() {
    this.editingId = null;
    ['manageKolo', 'manageDatum', 'manageDomaci', 'manageHoste', 'manageVysledek', 'manageSety'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    document.getElementById('manageTymDomaci').value = '';
    document.getElementById('manageTymHoste').value = '';
    document.getElementById('manageFormTitle').textContent = 'Přidat zápas';
  },

  saveZapas() {
    const soutez = document.getElementById('manageCompetition').value;
    const kolo = document.getElementById('manageKolo').value.trim();
    const tymDomaci = document.getElementById('manageTymDomaci').value;
    const tymHoste = document.getElementById('manageTymHoste').value;
    const disciplina = document.getElementById('manageDisciplina').value;
    const domaci = document.getElementById('manageDomaci').value.trim();
    const hoste = document.getElementById('manageHoste').value.trim();
    const vysledek = document.getElementById('manageVysledek').value.trim();
    const sety = document.getElementById('manageSety').value.trim();
    const datum = document.getElementById('manageDatum').value;

    if (!kolo || !tymDomaci || !tymHoste || !domaci || !hoste || !vysledek) {
      alert('Vyplň prosím kolo, oba týmy, hráče a výsledek.');
      return;
    }

    const zapas = {
      id: this.editingId || `manual:${Date.now()}`,
      kolo,
      datum,
      disciplina,
      domaci,
      hoste,
      vysledek,
      sety,
      tymDomaci,
      tymHoste,
    };

    AdminData.upsertZapas(soutez, zapas);
    this.resetForm();
    this.renderMatchList(soutez);
    AdminPublish.refreshSummary();
  },

  editZapas(soutez, id) {
    const z = AdminData.getZapasy(soutez).find((x) => x.id === id);
    if (!z) return;
    this.editingId = id;
    document.getElementById('manageKolo').value = z.kolo;
    document.getElementById('manageDatum').value = z.datum || '';
    document.getElementById('manageTymDomaci').value = z.tymDomaci;
    document.getElementById('manageTymHoste').value = z.tymHoste;
    document.getElementById('manageDisciplina').value = z.disciplina;
    document.getElementById('manageDomaci').value = z.domaci;
    document.getElementById('manageHoste').value = z.hoste;
    document.getElementById('manageVysledek').value = z.vysledek;
    document.getElementById('manageSety').value = z.sety;
    document.getElementById('manageFormTitle').textContent = 'Upravit zápas';
    window.scrollTo({ top: document.getElementById('manageFormTitle').offsetTop - 20, behavior: 'smooth' });
  },

  deleteZapas(soutez, id) {
    if (!confirm('Opravdu smazat tento zápas z konceptu?')) return;
    AdminData.removeZapas(soutez, id);
    this.renderMatchList(soutez);
    AdminPublish.refreshSummary();
  },

  renderMatchList(soutez) {
    const tbody = document.getElementById('manageMatchesBody');
    const list = [...AdminData.getZapasy(soutez)].sort((a, b) => String(a.kolo).localeCompare(String(b.kolo)));
    tbody.innerHTML = list
      .map(
        (z) => `<tr class="border-b border-gray-100 text-sm">
          <td class="p-1.5">${z.kolo}</td>
          <td class="p-1.5">${z.tymDomaci} – ${z.tymHoste}</td>
          <td class="p-1.5">${z.disciplina}</td>
          <td class="p-1.5">${z.domaci} vs ${z.hoste}</td>
          <td class="p-1.5 font-semibold">${z.vysledek}</td>
          <td class="p-1.5 text-right whitespace-nowrap">
            <button class="text-blue-600 hover:underline mr-2" onclick="AdminManage.editZapas('${soutez}','${z.id}')">Upravit</button>
            <button class="text-red-600 hover:underline" onclick="AdminManage.deleteZapas('${soutez}','${z.id}')">Smazat</button>
          </td>
        </tr>`
      )
      .join('');
  },

  // --- Tymy ---
  addTym() {
    const soutez = document.getElementById('manageCompetition').value;
    const input = document.getElementById('novyTym');
    AdminData.addTym(soutez, input.value);
    input.value = '';
    this.populateTeamSelects(soutez);
    this.renderTeamList(soutez);
    AdminPublish.refreshSummary();
  },

  removeTym(soutez, nazev) {
    if (!confirm(`Odebrat tým "${nazev}" ze seznamu?`)) return;
    AdminData.removeTym(soutez, nazev);
    this.populateTeamSelects(soutez);
    this.renderTeamList(soutez);
    AdminPublish.refreshSummary();
  },

  renderTeamList(soutez) {
    const el = document.getElementById('seznamTymu');
    const tymy = AdminData.draft.tymy[soutez] || [];
    el.innerHTML = tymy
      .map(
        (t) => `<div class="flex justify-between items-center py-1 border-b border-gray-100 text-sm">
          <span>${t}</span>
          <button class="text-red-600 hover:underline" onclick="AdminManage.removeTym('${soutez}', '${t.replace(/'/g, "\\'")}')">Odebrat</button>
        </div>`
      )
      .join('');
  },

  // --- Vitezove ---
  addVitez() {
    const sezona = document.getElementById('novaSezona').value;
    const tym = document.getElementById('novyVitezTym').value;
    AdminData.addVitez(sezona, tym);
    document.getElementById('novaSezona').value = '';
    document.getElementById('novyVitezTym').value = '';
    this.renderVitezList();
    AdminPublish.refreshSummary();
  },

  removeVitez(index) {
    if (!confirm('Odebrat tento záznam z historie vítězů?')) return;
    AdminData.removeVitez(index);
    this.renderVitezList();
    AdminPublish.refreshSummary();
  },

  renderVitezList() {
    const el = document.getElementById('seznamVitezu');
    el.innerHTML = AdminData.draft.vitezove
      .map(
        (v, i) => `<div class="flex justify-between items-center py-1 border-b border-gray-100 text-sm">
          <span>${v.sezona} — ${v.tym}</span>
          <button class="text-red-600 hover:underline" onclick="AdminManage.removeVitez(${i})">Odebrat</button>
        </div>`
      )
      .join('');
  },

  initAll() {
    const soutez = document.getElementById('manageCompetition').value;
    this.populateTeamSelects(soutez);
    this.renderTeamList(soutez);
    this.renderMatchList(soutez);
    this.renderVitezList();
  },
};
