const AdminSettings = {
  init() {
    document.getElementById('cfgAktualniRocnik').textContent = AdminData.draft.rocnik || '(bez ročníku)';
    this.renderKonfigForm();
    this.renderLogaList();
  },

  renderKonfigForm() {
    const k = AdminData.draft.konfigurace || {};
    document.getElementById('cfgExtraligaPlayoff').value = k.extraliga_playoff || 'QF+SF+F';
    document.getElementById('cfgPrvniLigaPlayoff').value = k.prvni_liga_playoff || 'combined-8';
    document.getElementById('cfgBaraze').value = k.baraze || 'single';
    document.getElementById('cfgSerieCelkemHer').value = (k.serie && k.serie.celkemHer) || 9;
    document.getElementById('cfgSerieRemizaPri').value = (k.serie && k.serie.remizaPri) || 4;
    document.getElementById('cfgFormatBodyNaSet').value = (k.format && k.format.bodyNaSet) || 21;
    document.getElementById('cfgFormatVitezSetu').value = (k.format && k.format.viteznychSetuNaHru) || 2;
    document.getElementById('cfgBodovaniJson').value = JSON.stringify(k.bodovani || {}, null, 2);
    document.getElementById('cfgZonyJson').value = JSON.stringify(k.zony || {}, null, 2);
    document.getElementById('cfgBodovaniInfoJson').value = JSON.stringify(k.bodovaniInfo || {}, null, 2);
  },

  saveKonfigForm() {
    if (!AdminData.draft.konfigurace) AdminData.draft.konfigurace = {};
    const k = AdminData.draft.konfigurace;

    let bodovani, zony, bodovaniInfo;
    try {
      bodovani = JSON.parse(document.getElementById('cfgBodovaniJson').value);
      zony = JSON.parse(document.getElementById('cfgZonyJson').value);
      bodovaniInfo = JSON.parse(document.getElementById('cfgBodovaniInfoJson').value);
    } catch (err) {
      document.getElementById('cfgStatus').textContent = '❌ Chyba v JSON poli: ' + err.message;
      return;
    }

    k.extraliga_playoff = document.getElementById('cfgExtraligaPlayoff').value;
    k.prvni_liga_playoff = document.getElementById('cfgPrvniLigaPlayoff').value;
    k.baraze = document.getElementById('cfgBaraze').value;
    k.serie = {
      celkemHer: parseInt(document.getElementById('cfgSerieCelkemHer').value, 10) || 9,
      remizaPri: parseInt(document.getElementById('cfgSerieRemizaPri').value, 10) || 4,
    };
    k.format = Object.assign({}, k.format, {
      bodyNaSet: parseInt(document.getElementById('cfgFormatBodyNaSet').value, 10) || 21,
      viteznychSetuNaHru: parseInt(document.getElementById('cfgFormatVitezSetu').value, 10) || 2,
    });
    k.bodovani = bodovani;
    k.zony = zony;
    k.bodovaniInfo = bodovaniInfo;

    document.getElementById('cfgStatus').textContent = '✓ Nastavení uloženo do konceptu. Nezapomeň publikovat.';
    AdminPublish.refreshSummary();
  },

  addLogo() {
    const tym = document.getElementById('logoTym').value.trim();
    const url = document.getElementById('logoUrl').value.trim();
    if (!tym || !url) return;
    AdminData.draft.tymLoga[tym] = url;
    document.getElementById('logoTym').value = '';
    document.getElementById('logoUrl').value = '';
    this.renderLogaList();
    AdminPublish.refreshSummary();
  },

  removeLogo(tym) {
    delete AdminData.draft.tymLoga[tym];
    this.renderLogaList();
    AdminPublish.refreshSummary();
  },

  renderLogaList() {
    const el = document.getElementById('seznamLoga');
    const entries = Object.entries(AdminData.draft.tymLoga || {});
    if (entries.length === 0) {
      el.innerHTML = '<p class="text-sm text-gray-400">Zatím žádná loga. Doplní se automaticky při syncu, nebo je přidej ručně výše.</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([tym, url]) => `<div class="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm gap-2">
          <img src="${url.replace(/"/g, '&quot;')}" alt="" style="width:24px;height:24px;object-fit:contain;border-radius:4px;flex-shrink:0;" onerror="this.style.visibility='hidden'">
          <span class="flex-1">${tym}</span>
          <button class="text-red-600 hover:underline" onclick="AdminSettings.removeLogo('${tym.replace(/'/g, "\\'")}')">Odebrat</button>
        </div>`
      )
      .join('');
  },

  zalozitNovouSezonu() {
    const currentRocnik = AdminData.draft.rocnik;
    const novy = prompt('Zadej novou sezónu (např. 2026/27):', '');
    if (!novy || !novy.trim()) return;

    if (currentRocnik) {
      const uzArchivovano = !!AdminData.draft.historicke_rocniky[currentRocnik];
      const archivovat = !uzArchivovano || confirm(
        `Sezóna ${currentRocnik} už je v historii archivovaná. Přepsat ji aktuálním živým stavem?`
      );
      if (archivovat) {
        AdminData.draft.historicke_rocniky[currentRocnik] = JSON.parse(JSON.stringify({
          zapasy: AdminData.draft.zapasy,
          tymy: AdminData.draft.tymy,
          konfigurace: AdminData.draft.konfigurace,
        }));
      }
    }

    const emptyZapasy = {};
    const emptyTymy = {};
    SOUTEZE.forEach((s) => {
      emptyZapasy[s] = [];
      emptyTymy[s] = [];
    });
    AdminData.draft.zapasy = emptyZapasy;
    AdminData.draft.tymy = emptyTymy;
    AdminData.draft.rocnik = novy.trim();
    // konfigurace se ponechava jako vychozi bod pro novou sezonu (klon te dnesni) - uprav nize.

    document.getElementById('cfgAktualniRocnik').textContent = AdminData.draft.rocnik;
    document.getElementById('cfgStatus').textContent =
      `✓ Založena nová sezóna ${AdminData.draft.rocnik} v konceptu` +
      (currentRocnik ? ` (${currentRocnik} archivována do historie)` : '') +
      '. Zkontroluj nastavení níže a přidej týmy, pak publikuj.';

    AdminManage.populateCompetitionSelects();
    AdminManage.initAll();
    AdminPublish.refreshSummary();
  },
};
