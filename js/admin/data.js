const SOUTEZE = ['extraliga', 'prvni-liga-vychod', 'prvni-liga-zapad', 'prvni-liga-playoff', 'baraze'];

const AdminData = {
  raw: null, // posledni nactena/publikovana verze (pro zjisteni zmen)
  draft: null, // pracovni kopie, kterou uzivatel edituje pred publikaci

  async load() {
    const data = await AdminApi.currentData();
    this.raw = data;
    this.draft = JSON.parse(JSON.stringify(data));
    SOUTEZE.forEach((s) => {
      if (!this.draft.zapasy[s]) this.draft.zapasy[s] = [];
      if (!this.draft.tymy[s]) this.draft.tymy[s] = [];
    });
    if (!this.draft.vitezove) this.draft.vitezove = [];
    if (!this.draft.historicke_rocniky) this.draft.historicke_rocniky = {};
    if (!this.draft.tymLoga) this.draft.tymLoga = {};
    if (!this.draft.konfigurace) this.draft.konfigurace = {};
    return this.draft;
  },

  isDirty() {
    return JSON.stringify(this.draft) !== JSON.stringify(this.raw);
  },

  changeSummary() {
    let pridano = 0;
    let zmeneno = 0;
    SOUTEZE.forEach((s) => {
      const rawById = new Map((this.raw.zapasy[s] || []).map((z) => [z.id, z]));
      (this.draft.zapasy[s] || []).forEach((z) => {
        const old = rawById.get(z.id);
        if (!old) pridano++;
        else if (JSON.stringify(old) !== JSON.stringify(z)) zmeneno++;
      });
    });
    return { pridano, zmeneno };
  },

  getZapasy(soutez) {
    return this.draft.zapasy[soutez] || [];
  },

  upsertZapas(soutez, zapas) {
    const list = this.draft.zapasy[soutez];
    const idx = list.findIndex((z) => z.id === zapas.id);
    if (idx === -1) list.push(zapas);
    else list[idx] = zapas;
  },

  removeZapas(soutez, id) {
    this.draft.zapasy[soutez] = this.draft.zapasy[soutez].filter((z) => z.id !== id);
  },

  addTym(soutez, nazev) {
    nazev = nazev.trim();
    if (!nazev) return;
    if (!this.draft.tymy[soutez].includes(nazev)) {
      this.draft.tymy[soutez].push(nazev);
      this.draft.tymy[soutez].sort();
    }
  },

  removeTym(soutez, nazev) {
    this.draft.tymy[soutez] = this.draft.tymy[soutez].filter((t) => t !== nazev);
  },

  addVitez(sezona, tym) {
    sezona = sezona.trim();
    tym = tym.trim();
    if (!sezona || !tym) return;
    this.draft.vitezove.push({ sezona, tym });
  },

  removeVitez(index) {
    this.draft.vitezove.splice(index, 1);
  },

  // Nedestruktivni sloucení log stažených ze sync API - nastaví/přepíše jen
  // ty položky, které API skutečně vrátilo, ostatní (např. ruční override
  // pro tým, co API zatím nemá) zůstávají beze změny.
  mergeTymLoga(teamLogos) {
    Object.entries(teamLogos || {}).forEach(([nazev, url]) => {
      if (url) this.draft.tymLoga[nazev] = url;
    });
  },
};
