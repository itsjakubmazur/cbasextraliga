// Kazda soutez ma vlastni format/bodovani/play-off, ktere se meni nezavisle
// (napr. 1. liga muze prejit na jiny pocet setu/bodu nez extraliga) - proto
// se nastavuji ve 3 oddelenych skupinach, ne jako jedna spolecna sada poli.
// "1. liga" skupina zapisuje stejnou hodnotu do vsech tri jejich soutezi
// (vychod/zapad/playoff), protoze v praxi vzdy hraji stejnym formatem.
const KONFIG_GROUPS = [
  { id: 'Ext', label: 'Extraliga', soutezKeys: ['extraliga'] },
  { id: 'Pl', label: '1. liga', soutezKeys: ['prvni-liga-vychod', 'prvni-liga-zapad', 'prvni-liga-playoff'] },
  { id: 'Br', label: 'Baráž', soutezKeys: ['baraze'] },
];

function describeBodovani(b) {
  if (!b) return '—';
  if (b.typ === 'win-draw-loss' && b.body) {
    return `výhra ${b.body.vyhra}b · remíza ${b.body.remiza}b · prohra ${b.body.prohra}b`;
  }
  if (b.typ === 'margin-tiered' && b.tiers) {
    return b.tiers.map((t) => `${t.minZapasyVitez}+ výher → ${t.body[0]}:${t.body[1]}b`).join(' · ');
  }
  return '—';
}

function describeZony(zList) {
  if (!zList || !zList.length) return 'žádné zóny';
  const legendy = zList.filter((z) => z.legenda).map((z) => z.legenda);
  return legendy.length ? legendy.join(' · ') : 'žádné zóny';
}

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

    KONFIG_GROUPS.forEach((g) => {
      const rep = g.soutezKeys[0];
      const serie = (k.serie && k.serie[rep]) || {};
      const format = (k.format && k.format[rep]) || {};
      document.getElementById(`cfg${g.id}CelkemHer`).value = serie.celkemHer || 9;
      document.getElementById(`cfg${g.id}RemizaPri`).value = serie.remizaPri || 4;
      document.getElementById(`cfg${g.id}BodyNaSet`).value = format.bodyNaSet || 21;
      document.getElementById(`cfg${g.id}MaxBodu`).value = format.maxBoduVSetu || format.bodyNaSet || 21;
      document.getElementById(`cfg${g.id}VitezSetu`).value = format.viteznychSetuNaHru || 2;
      document.getElementById(`cfg${g.id}BodovaniJson`).value = JSON.stringify((k.bodovani && k.bodovani[rep]) || {}, null, 2);
      document.getElementById(`cfg${g.id}ZonyJson`).value = JSON.stringify((k.zony && k.zony[rep]) || [], null, 2);
      document.getElementById(`cfg${g.id}BodovaniInfo`).value = (k.bodovaniInfo && k.bodovaniInfo[rep]) || '';
    });

    this.renderKonfigSummary();
  },

  renderKonfigSummary() {
    const k = AdminData.draft.konfigurace || {};
    KONFIG_GROUPS.forEach((g) => {
      const rep = g.soutezKeys[0];
      const bodovani = (k.bodovani && k.bodovani[rep]) || null;
      const zony = (k.zony && k.zony[rep]) || null;
      const el = document.getElementById(`cfg${g.id}Summary`);
      el.innerHTML = `<div class="cfg-summary-row"><span class="cfg-summary-val">${describeBodovani(bodovani)}<br>${describeZony(zony)}</span></div>`;
    });
  },

  saveKonfigForm() {
    if (!AdminData.draft.konfigurace) AdminData.draft.konfigurace = {};
    const k = AdminData.draft.konfigurace;
    k.bodovani = k.bodovani || {};
    k.zony = k.zony || {};
    k.bodovaniInfo = k.bodovaniInfo || {};
    k.serie = k.serie || {};
    k.format = k.format || {};

    // Nejdriv naparsovat a zvalidovat VSECHNY skupiny, teprve pak neco zapsat -
    // at chyba v jedne skupine nenechá koncept v napůl uloženém stavu.
    const parsed = [];
    for (const g of KONFIG_GROUPS) {
      try {
        const bodovani = JSON.parse(document.getElementById(`cfg${g.id}BodovaniJson`).value);
        const zony = JSON.parse(document.getElementById(`cfg${g.id}ZonyJson`).value);
        parsed.push({ g, bodovani, zony });
      } catch (err) {
        document.getElementById('cfgStatus').textContent = `❌ Chyba v JSON poli skupiny „${g.label}": ${err.message}`;
        return;
      }
    }

    k.extraliga_playoff = document.getElementById('cfgExtraligaPlayoff').value;
    k.prvni_liga_playoff = document.getElementById('cfgPrvniLigaPlayoff').value;
    k.baraze = document.getElementById('cfgBaraze').value;

    parsed.forEach(({ g, bodovani, zony }) => {
      const serieObj = {
        celkemHer: parseInt(document.getElementById(`cfg${g.id}CelkemHer`).value, 10) || 9,
        remizaPri: parseInt(document.getElementById(`cfg${g.id}RemizaPri`).value, 10) || 4,
      };
      const formatObj = {
        bodyNaSet: parseInt(document.getElementById(`cfg${g.id}BodyNaSet`).value, 10) || 21,
        maxBoduVSetu: parseInt(document.getElementById(`cfg${g.id}MaxBodu`).value, 10) || 21,
        viteznychSetuNaHru: parseInt(document.getElementById(`cfg${g.id}VitezSetu`).value, 10) || 2,
      };
      const bodovaniInfo = document.getElementById(`cfg${g.id}BodovaniInfo`).value;

      g.soutezKeys.forEach((soutez) => {
        k.serie[soutez] = serieObj;
        k.format[soutez] = Object.assign({}, k.format[soutez], formatObj);
        k.bodovani[soutez] = bodovani;
        k.zony[soutez] = zony;
        k.bodovaniInfo[soutez] = bodovaniInfo;
      });
    });

    this.renderKonfigSummary();
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

  async removeLogo(tym) {
    const ok = await AdminModal.confirm({
      title: 'Odebrat logo?',
      body: `Logo pro „${tym}" zmizí. Příští sync ho případně zase doplní, pokud ho API nabízí.`,
      confirmLabel: 'Odebrat',
      danger: true,
    });
    if (!ok) return;
    delete AdminData.draft.tymLoga[tym];
    this.renderLogaList();
    AdminPublish.refreshSummary();
  },

  renderLogaList() {
    const el = document.getElementById('seznamLoga');
    const entries = Object.entries(AdminData.draft.tymLoga || {});
    if (entries.length === 0) {
      el.innerHTML = '<div class="list-empty">Zatím žádná loga. Doplní se automaticky při syncu, nebo je přidej ručně výše.</div>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([tym, url]) => `<div class="list-row">
          <img class="list-row-logo" src="${url.replace(/"/g, '&quot;')}" alt="" onerror="this.style.visibility='hidden'">
          <span style="flex:1;">${tym}</span>
          <button class="btn-danger-text" onclick="AdminSettings.removeLogo('${tym.replace(/'/g, "\\'")}')">Odebrat</button>
        </div>`
      )
      .join('');
  },

  async zalozitNovouSezonu() {
    const currentRocnik = AdminData.draft.rocnik;
    const novy = await AdminModal.prompt({
      title: 'Založit novou sezónu',
      body: currentRocnik
        ? `Aktuální ${currentRocnik} se archivuje do historie a živá data se vyresetují na prázdno.`
        : 'Zadej označení nové sezóny.',
      inputPlaceholder: 'např. 2026/27',
      confirmLabel: 'Pokračovat',
    });
    if (!novy || !novy.trim()) return;

    if (currentRocnik) {
      const uzArchivovano = !!AdminData.draft.historicke_rocniky[currentRocnik];
      let archivovat = true;
      if (uzArchivovano) {
        archivovat = await AdminModal.confirm({
          title: 'Sezóna už je archivovaná',
          body: `${currentRocnik} už je v historii. Přepsat ji aktuálním živým stavem, nebo ponechat, jak tam je?`,
          confirmLabel: 'Přepsat',
          cancelLabel: 'Ponechat',
          danger: false,
        });
      }
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
