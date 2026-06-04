const App = {
    aktualni_soutez: 'extraliga',
    vybrana_kola: new Set(),
    aktualni_pohled: 'zakladni',
    aktualni_rocnik: null,          // null = current season, string = historical
    aktualni_historicky_pohled: 'extraliga',  // 'extraliga' | 'liga' | 'baraze'
    aktualni_tymy_soutez: 'extraliga',

    async init() {
        const success = await Data.nacist();
        if (success) {
            this._buildRocnikSelector();
            this._navigovatZeHash(window.location.hash.replace('#', ''));
        }

        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            const icon = document.getElementById('darkModeIcon');
            const text = document.getElementById('darkModeText');
            if (icon) icon.innerHTML = Icons.sun();
            if (text) text.textContent = 'Light Mode';
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'block') modal.style.display = 'none';
                });
            }
        });

        window.addEventListener('hashchange', () => {
            this._navigovatZeHash(window.location.hash.replace('#', ''));
        });
    },

    // Parse hash and navigate:
    //   "2024-25/extraliga"  → historical season, extraliga view
    //   "extraliga/playoff"  → current season, extraliga, playoff tab
    //   "extraliga"          → current season, extraliga
    _navigovatZeHash(hash) {
        const validSouteze = ['extraliga', 'prvni-liga-vychod', 'prvni-liga-zapad'];
        const validHistPohled = ['extraliga', 'liga', 'baraze'];
        const validPohledy = ['zakladni', 'playoff', 'baraze'];

        if (hash.includes('/')) {
            const lastSlash = hash.lastIndexOf('/');
            const cast1 = hash.substring(0, lastSlash);
            const cast2 = hash.substring(lastSlash + 1);
            const historicke = Data.getHistorickeRocniky();

            if (historicke.includes(cast1) && validHistPohled.includes(cast2)) {
                // Historical season
                this.aktualni_rocnik = cast1;
                this.aktualni_historicky_pohled = cast2;
                Data.aktivovatRocnik(cast1);
                this._updateRocnikButtons();
                if (this._maZakladniCast()) {
                    this._prepnoutPlnyHistorickyMode();
                } else {
                    this._prepnoutHistorickyMode();
                }
                return;
            }

            if (validSouteze.includes(cast1) && validPohledy.includes(cast2)) {
                // Current season with specific view tab (e.g. extraliga/playoff)
                if (this.jeHistoricky()) {
                    this.aktualni_rocnik = null;
                    Data.aktivovatRocnik(null);
                    this._updateRocnikButtons();
                }
                this.zmenitSoutez(cast1);
                this.prepnoutPohled(cast2);
                return;
            }
        }

        // Plain current-season hash or fallback
        if (this.jeHistoricky()) {
            this.aktualni_rocnik = null;
            Data.aktivovatRocnik(null);
            this._updateRocnikButtons();
            this._prepnoutAktualniMode();
        }
        const soutez = validSouteze.includes(hash) ? hash : 'extraliga';
        if (!this.jeHistoricky()) this.zmenitSoutez(soutez);
    },

    _buildRocnikSelector() {
        const historicke = Data.getHistorickeRocniky();
        if (historicke.length === 0) return;

        const selector = document.getElementById('rocnikSelector');
        const buttons = document.getElementById('rocnikButtons');
        if (!selector || !buttons) return;

        selector.style.display = 'block';

        const makeBtn = (label, rocnik) => {
            const btn = document.createElement('button');
            btn.className = 'rocnik-btn';
            btn.dataset.rocnik = rocnik || 'current';
            btn.textContent = label;
            btn.onclick = () => this.zmenitRocnik(rocnik || null);
            return btn;
        };

        buttons.appendChild(makeBtn('Aktuální', null));
        historicke.forEach(r => {
            // Format "2024-25" → "2024/25"
            const label = r.replace('-', '/');
            buttons.appendChild(makeBtn(label, r));
        });

        this._updateRocnikButtons();
    },

    _updateRocnikButtons() {
        const activeKey = this.aktualni_rocnik || 'current';
        document.querySelectorAll('.rocnik-btn').forEach(btn => {
            const isActive = btn.dataset.rocnik === activeKey;
            btn.classList.toggle('rocnik-btn-active', isActive);
            btn.style.cssText = '';
            btn.onmouseover = null;
            btn.onmouseout = null;
        });
    },

    jeHistoricky() {
        return !!this.aktualni_rocnik;
    },

    _maZakladniCast() {
        return (Data.zapasy['extraliga'] || []).some(z => !Statistics.isPlayoffKolo(z.kolo));
    },

    zmenitRocnik(rocnik) {
        this.aktualni_rocnik = rocnik;
        Data.aktivovatRocnik(rocnik);
        this._updateRocnikButtons();

        if (this.jeHistoricky()) {
            if (this._maZakladniCast()) {
                this._prepnoutPlnyHistorickyMode();
            } else {
                this._prepnoutHistorickyMode();
            }
        } else {
            this._prepnoutAktualniMode();
        }
    },

    _aktualizovatHash() {
        if (this.jeHistoricky()) {
            const newHash = this.aktualni_rocnik + '/' + this.aktualni_historicky_pohled;
            if (window.location.hash.replace('#', '') !== newHash) {
                history.replaceState(null, '', '#' + newHash);
            }
        }
    },

    _prepnoutHistorickyMode() {
        const tymyView = document.getElementById('tymyViewContainer');
        if (tymyView) tymyView.style.display = 'none';
        document.getElementById('nav-tymy')?.classList.remove('active');
        const hero = document.getElementById('heroContainer');
        if (hero) hero.style.display = 'none';
        document.getElementById('soutezTabs').style.display = 'none';
        document.getElementById('historickyNav').style.display = 'flex';
        document.getElementById('rychleFiltry').style.display = 'none';
        document.getElementById('hracMesiceContainer').style.display = 'none';
        document.getElementById('tabulkaPlayoffContainer').style.display = 'none';
        document.getElementById('zapasyContainer').style.display = 'none';
        document.getElementById('statistikyContainer').style.display = 'none';
        document.getElementById('prazdnyStav').style.display = 'none';

        this.zmenitHistorickyPohled(this.aktualni_historicky_pohled);
    },

    _prepnoutAktualniMode() {
        const tymyView = document.getElementById('tymyViewContainer');
        if (tymyView) tymyView.style.display = 'none';
        document.getElementById('nav-tymy')?.classList.remove('active');
        document.getElementById('soutezTabs').style.display = 'flex';
        document.getElementById('historickyNav').style.display = 'none';
        document.getElementById('historickyContainer').style.display = 'none';
        document.getElementById('historickyStatContainer').style.display = 'none';

        this.aktualni_pohled = 'zakladni';
        this.zmenitSoutez(this.aktualni_soutez);
    },

    _prepnoutPlnyHistorickyMode() {
        document.getElementById('soutezTabs').style.display = 'flex';
        document.getElementById('historickyNav').style.display = 'none';
        document.getElementById('historickyContainer').style.display = 'none';
        document.getElementById('historickyStatContainer').style.display = 'none';
        this.zmenitSoutez('extraliga');
    },

    zmenitHistorickyPohled(pohled) {
        this.aktualni_historicky_pohled = pohled;
        this._aktualizovatHash();

        // Update nav buttons
        ['extraliga', 'liga', 'baraze'].forEach(p => {
            const btn = document.getElementById('hNav-' + p);
            if (!btn) return;
            btn.className = 'soutez-tab sidebar-nav-item' + (p === pohled ? ' active' : '');
        });

        const container = document.getElementById('historickyContainer');
        const nadpis = document.getElementById('historickyNadpis');
        const pavoucek = document.getElementById('historickyPavoucek');
        const statContainer = document.getElementById('historickyStatContainer');

        if (!container || !pavoucek) return;

        container.style.display = 'block';

        if (pohled === 'baraze') {
            nadpis.textContent = 'Baráž – ' + (this.aktualni_rocnik || '').replace('-', '/');
            pavoucek.innerHTML = Playoff.renderBaraze();
            statContainer.style.display = 'none';
        } else if (pohled === 'extraliga') {
            nadpis.textContent = 'Extraliga play-off – ' + (this.aktualni_rocnik || '').replace('-', '/');
            const heroHtml = this._renderHeroHTML();
            pavoucek.innerHTML = (heroHtml ? '<div class="hist-hero-wrap">' + heroHtml + '</div>' : '') + this._renderHistorickyPlayoff('extraliga');
            Playoff.drawConnectors();
            this._renderHistorickyStatistiky('extraliga');
        } else {
            nadpis.textContent = '1. liga play-off – ' + (this.aktualni_rocnik || '').replace('-', '/');
            pavoucek.innerHTML = this._renderHistorickyPlayoff('liga');
            Playoff.drawConnectors();
            this._renderHistorickyStatistiky('liga');
        }
    },

    _renderHistorickyPlayoff(typ) {
        const konfig = Data.getKonfigurace(this.aktualni_rocnik);
        if (typ === 'extraliga') {
            const format = konfig.extraliga_playoff || 'QF+SF+F';
            const tabulkaData = Statistics.vypocitejTabulku('extraliga');
            let tymy = Playoff.seraditTymy(tabulkaData);
            const res = Playoff.getPlayoffResults('extraliga');
            // Historical data has only playoff matches – derive teams from results if table is empty
            if (tymy.length < 6) {
                tymy = Playoff._deriveExtraligaTeamsFromResults(res);
            }
            if (format === 'QF+SF+F+3rd') {
                return Playoff.renderExtraligaBracketWithThirdPlace(tymy, tabulkaData, res);
            }
            return Playoff.renderExtraligaBracket(tymy, tabulkaData, res);
        }

        const format = konfig.prvni_liga_playoff || 'combined-8';
        switch (format) {
            case 'combined-4': return Playoff.renderPrvniLigaCombined4();
            case 'separate-SF+F': return Playoff.renderPrvniLigaSeparate('SF');
            case 'separate-QF+SF+F+3rd': return Playoff.renderPrvniLigaSeparate('QF');
            default: return Playoff.renderPrvniLigaBracket();
        }
    },

    _renderHistorickyStatistiky(typ) {
        const statContainer = document.getElementById('historickyStatContainer');
        const statObsah = document.getElementById('historickyStatObsah');
        if (!statContainer || !statObsah) return;

        const konfig = Data.getKonfigurace(this.aktualni_rocnik);
        let zapasyProStats = [];

        if (typ === 'extraliga') {
            zapasyProStats = (Data.zapasy['extraliga'] || []).filter(z => Statistics.isPlayoffKolo(z.kolo));
        } else {
            const format = konfig.prvni_liga_playoff || 'combined-8';
            if (format === 'combined-4' || format === 'combined-8') {
                zapasyProStats = Data.zapasy['prvni-liga-playoff'] || [];
            } else {
                // Separate E/W – merge playoff rounds from both
                zapasyProStats = [
                    ...(Data.zapasy['prvni-liga-vychod'] || []).filter(z => Statistics.isPlayoffKolo(z.kolo)),
                    ...(Data.zapasy['prvni-liga-zapad'] || []).filter(z => Statistics.isPlayoffKolo(z.kolo))
                ];
            }
        }

        if (zapasyProStats.length === 0) {
            statContainer.style.display = 'none';
            return;
        }

        statContainer.style.display = 'block';
        statObsah.innerHTML = Players.renderStatistikyZapasy(zapasyProStats);
    },

    bottomNavClick(target) {
        // Update active button
        ['zakladni', 'playoff', 'vysledky', 'hrac'].forEach(id => {
            const btn = document.getElementById('bnav-' + id);
            if (btn) btn.classList.toggle('active', id === target);
        });

        // Dismiss teams view if active
        const tymyView = document.getElementById('tymyViewContainer');
        if (tymyView && tymyView.style.display !== 'none') {
            this.zobrazitData();
        }

        if (target === 'zakladni') {
            this.prepnoutPohled('zakladni');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (target === 'playoff') {
            this.prepnoutPohled('playoff');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (target === 'vysledky') {
            const el = document.getElementById('zapasyContainer');
            if (el && el.style.display !== 'none') {
                // Ensure expanded
                const obsah = document.getElementById('zapasyObsah');
                if (obsah && obsah.style.display === 'none') this.toggleSekce('zapasyObsah');
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (target === 'hrac') {
            const el = document.getElementById('statistikyContainer');
            if (el && el.style.display !== 'none') {
                const obsah = document.getElementById('statistikyObsah');
                if (obsah && obsah.style.display === 'none') this.toggleSekce('statistikyObsah');
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        const icon = document.getElementById('darkModeIcon');
        const text = document.getElementById('darkModeText');
        if (icon) icon.innerHTML = isDark ? Icons.sun() : Icons.moon();
        if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    },

    _maPlayoffData(soutez) {
        if ((Data.zapasy[soutez] || []).some(z => Statistics.isPlayoffKolo(z.kolo))) return true;
        if ((soutez === 'prvni-liga-vychod' || soutez === 'prvni-liga-zapad') &&
            (Data.zapasy['prvni-liga-playoff'] || []).length > 0) return true;
        return false;
    },

    zmenitSoutez(soutez) {
        this.aktualni_soutez = soutez;

        if (!this.jeHistoricky() && window.location.hash.replace('#', '') !== soutez) {
            history.replaceState(null, '', '#' + soutez);
        }

        document.querySelectorAll('.soutez-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const activeTab = document.getElementById('tab-' + soutez);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        document.getElementById('tabulkaSoutez').textContent = Data.soutezNazvy[soutez];

        this.vybrana_kola.clear();
        this.aktualizovatSelecty();

        this.aktualni_pohled = this._maPlayoffData(soutez) ? 'playoff' : 'zakladni';
        this.aktualizovatPohledToggle();

        this.zobrazitData();
    },

    prepnoutPohled(pohled) {
        this.aktualni_pohled = pohled;
        this.aktualizovatPohledToggle();

        const tabulkaObsah = document.getElementById('tabulkaObsah');
        const playoffObsah = document.getElementById('playoffObsah');
        const barazeObsah = document.getElementById('barazeObsah');

        tabulkaObsah.style.display = 'none';
        playoffObsah.style.display = 'none';
        barazeObsah.style.display = 'none';

        if (pohled === 'zakladni') {
            tabulkaObsah.style.display = 'block';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Tabulka';
        } else if (pohled === 'playoff') {
            playoffObsah.style.display = 'block';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Play-off pavouk';
            Playoff.render(this.aktualni_soutez);
            Playoff.drawConnectors();
        } else if (pohled === 'baraze') {
            barazeObsah.style.display = 'block';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Baráž';
            barazeObsah.innerHTML = Playoff.renderBaraze();
        }
    },

    aktualizovatPohledToggle() {
        const btnZakladni = document.getElementById('viewToggleZakladni');
        const btnPlayoff = document.getElementById('viewTogglePlayoff');
        const btnBaraze = document.getElementById('viewToggleBaraze');
        if (!btnZakladni || !btnPlayoff) return;

        btnZakladni.classList.toggle('active', this.aktualni_pohled === 'zakladni');
        btnPlayoff.classList.toggle('active', this.aktualni_pohled === 'playoff');
        if (btnBaraze) btnBaraze.classList.toggle('active', this.aktualni_pohled === 'baraze');
    },

    toggleSekce(id) {
        const obsah = document.getElementById(id);
        const toggle = document.getElementById(id.replace('Obsah', 'Toggle'));

        if (obsah.style.display === 'none') {
            obsah.style.display = 'block';
            if (toggle) toggle.textContent = '▼';
        } else {
            obsah.style.display = 'none';
            if (toggle) toggle.textContent = '▶';
        }
    },

    aktualizovatSelecty() {
        const filtrTym = document.getElementById('filtrTym');
        if (filtrTym) {
            const currentFiltr = filtrTym.value;
            filtrTym.innerHTML = '<option value="">Všechny týmy</option>' +
                Data.tymy[this.aktualni_soutez].map(t =>
                    '<option value="' + Statistics.escapeAttr(t) + '">' + Statistics.escapeHtml(t) + '</option>'
                ).join('');
            if (Data.tymy[this.aktualni_soutez].includes(currentFiltr)) {
                filtrTym.value = currentFiltr;
            }
        }
    },

    aktualizovatKolaCheckboxy() {
        Filters.renderKolaCheckboxy(this.aktualni_soutez, this.vybrana_kola);
    },

    zobrazitData() {
        const tymyView = document.getElementById('tymyViewContainer');
        if (tymyView) tymyView.style.display = 'none';
        document.getElementById('nav-tymy')?.classList.remove('active');
        const hasData = Data.zapasy[this.aktualni_soutez] && Data.zapasy[this.aktualni_soutez].length > 0;

        if (!hasData) {
            ['zapasyContainer', 'statistikyContainer', 'tabulkaPlayoffContainer', 'hracMesiceContainer', 'rychleFiltry'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            document.getElementById('prazdnyStav').style.display = 'block';
            return;
        }

        ['zapasyContainer', 'statistikyContainer', 'tabulkaPlayoffContainer', 'hracMesiceContainer', 'rychleFiltry'].forEach(id =>
            document.getElementById(id).style.display = 'block'
        );
        document.getElementById('prazdnyStav').style.display = 'none';

        // Show/hide Baráž button based on data
        const hasBaraze = (Data.zapasy['baraze'] || []).length > 0;
        const btnBaraze = document.getElementById('viewToggleBaraze');
        if (btnBaraze) btnBaraze.style.display = hasBaraze ? '' : 'none';

        this.aktualizovatKolaCheckboxy();
        this.aktualizovatSelecty();

        this._renderHero();
        Filters.render(this.aktualni_soutez, this.vybrana_kola);
        Players.renderTop3(this.aktualni_soutez, this.vybrana_kola);
        Table.render(this.aktualni_soutez);

        if (this.aktualni_pohled === 'playoff') {
            document.getElementById('tabulkaObsah').style.display = 'none';
            document.getElementById('playoffObsah').style.display = 'block';
            document.getElementById('barazeObsah').style.display = 'none';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Play-off pavouk';
            Playoff.render(this.aktualni_soutez);
            Playoff.drawConnectors();
        } else if (this.aktualni_pohled === 'baraze') {
            document.getElementById('tabulkaObsah').style.display = 'none';
            document.getElementById('playoffObsah').style.display = 'none';
            document.getElementById('barazeObsah').style.display = 'block';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Baráž';
            document.getElementById('barazeObsah').innerHTML = Playoff.renderBaraze();
        } else {
            document.getElementById('tabulkaObsah').style.display = 'block';
            document.getElementById('playoffObsah').style.display = 'none';
            document.getElementById('barazeObsah').style.display = 'none';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Tabulka';
        }

        Matches.render(this.aktualni_soutez);
        Players.renderStatistiky(this.aktualni_soutez, this.vybrana_kola);
    },

    zobrazitTymy() {
        ['heroContainer', 'rychleFiltry', 'hracMesiceContainer', 'tabulkaPlayoffContainer',
         'zapasyContainer', 'statistikyContainer', 'prazdnyStav',
         'historickyContainer', 'historickyStatContainer'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        document.getElementById('tymyViewContainer').style.display = 'block';
        document.getElementById('nav-tymy')?.classList.add('active');
        this.aktualni_tymy_soutez = this.aktualni_soutez;
        this.tymyZmenitSoutez(this.aktualni_tymy_soutez);
    },

    tymyZmenitSoutez(soutez) {
        this.aktualni_tymy_soutez = soutez;
        const tabMap = { 'extraliga': 'tymyViewTab-extraliga', 'prvni-liga-vychod': 'tymyViewTab-vychod', 'prvni-liga-zapad': 'tymyViewTab-zapad' };
        Object.values(tabMap).forEach(id => document.getElementById(id)?.classList.remove('active'));
        document.getElementById(tabMap[soutez])?.classList.add('active');
        this._renderTymyGrid();
    },

    _renderTymyGrid() {
        const soutez = this.aktualni_tymy_soutez;
        const tabulkaData = Statistics.vypocitejTabulku(soutez);
        const tymy = Statistics.seraditTymyPodleTabulky(tabulkaData);
        const soutezLabels = { 'extraliga': 'Extraliga', 'prvni-liga-vychod': '1. liga – Východ', 'prvni-liga-zapad': '1. liga – Západ' };
        const nadpis = document.getElementById('tymyViewNadpis');
        if (nadpis) nadpis.innerHTML = Icons.users() + ' ' + (soutezLabels[soutez] || 'Soupisky');
        const avatarColors = ['#D7141A','#2563eb','#16a34a','#d97706','#8b5cf6','#ec4899','#06b6d4','#0891b2','#7c3aed','#db2777','#059669','#b45309','#dc2626','#1d4ed8','#047857'];
        if (tymy.length === 0) {
            document.getElementById('tymyViewGrid').innerHTML = '<div style="padding:32px;text-align:center;color:var(--text2);font-size:0.85rem;">Pro tuto soutěž nejsou data.</div>';
            return;
        }
        document.getElementById('tymyViewGrid').innerHTML = tymy.map((tym, idx) => {
            const t = tabulkaData[tym] || {};
            const color = avatarColors[idx % avatarColors.length];
            const abbr = tym.split(/\s+/).filter(w => !['sk','bk','tj','ba','ac','sc','tk'].includes(w.toLowerCase())).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('') || tym.charAt(0).toUpperCase();
            const statsText = t.utkani ? t.vyhry + 'V / ' + t.prohry + 'P · ' + t.body + ' bodů' : '';
            return '<div class="team-tile" onclick="App.zobrazitRoster(\'' + Statistics.escapeAttr(tym) + '\')">' +
                '<div class="team-tile-avatar" style="background:' + color + ';">' + abbr + '</div>' +
                '<div class="team-tile-info"><div class="team-tile-name">' + Statistics.escapeHtml(tym) + '</div>' +
                (statsText ? '<div class="team-tile-stats">' + statsText + '</div>' : '') +
                '</div><div class="team-tile-pos">' + (idx + 1) + '.</div></div>';
        }).join('');
    },

    zobrazitRoster(tym) {
        const soutez = this.aktualni_tymy_soutez;
        let zapasyTymu = [];
        if (soutez.includes('prvni-liga')) {
            const all = [...(Data.zapasy[soutez] || []), ...(Data.zapasy['prvni-liga-playoff'] || [])];
            zapasyTymu = all.filter(z => z.tymDomaci === tym || z.tymHoste === tym);
        } else {
            zapasyTymu = (Data.zapasy[soutez] || []).filter(z => z.tymDomaci === tym || z.tymHoste === tym);
        }

        const hraci = {};
        zapasyTymu.forEach(z => {
            if (Statistics.isNeodehrano(z)) return;
            const jeDom = z.tymDomaci === tym;
            const hraciT = jeDom ? Statistics.getHraciFromTeam(z.domaci) : Statistics.getHraciFromTeam(z.hoste);
            hraciT.forEach(h => {
                if (h === 'SKREČ') return;
                if (!hraci[h]) hraci[h] = { zapasy: 0, vyhry: 0, prohry: 0 };
                hraci[h].zapasy++;
                const v = Statistics.parseVysledek(z.vysledek);
                const vyhr = jeDom ? (v.domaci > v.hoste) : (v.hoste > v.domaci);
                if (vyhr) hraci[h].vyhry++; else hraci[h].prohry++;
            });
        });

        const avatarColors = ['#D7141A','#2563eb','#16a34a','#d97706','#8b5cf6','#ec4899','#06b6d4','#0891b2','#7c3aed','#db2777'];
        const cardsHtml = Object.entries(hraci)
            .sort((a, b) => b[1].vyhry - a[1].vyhry || b[1].zapasy - a[1].zapasy)
            .map(([h, st], idx) => {
                const wr = st.zapasy > 0 ? ((st.vyhry / st.zapasy) * 100).toFixed(0) : '0';
                const isGood = parseFloat(wr) >= 50;
                const color = avatarColors[idx % avatarColors.length];
                const abbr = h.split(/\s+/).pop()?.charAt(0).toUpperCase() || h.charAt(0).toUpperCase();
                const safeH = Statistics.escapeAttr(h);
                return '<div class="roster-card" onclick="Modals.zobrazitDetailHrace(\'' + safeH + '\')">' +
                    '<div class="roster-photo">' +
                    '<div class="roster-photo-img" style="background:' + color + '">' + abbr + '</div>' +
                    '</div>' +
                    '<div class="roster-winrate ' + (isGood ? 'good' : 'bad') + '">' + wr + '%</div>' +
                    '<div class="roster-name">' + Statistics.escapeHtml(h) + '</div>' +
                    '<div class="roster-stats">' + st.vyhry + 'V · ' + st.prohry + 'P · ' + st.zapasy + 'Z</div>' +
                    '</div>';
            }).join('');

        const nadpis = document.getElementById('tymyViewNadpis');
        if (nadpis) nadpis.innerHTML =
            '<button onclick="App._renderTymyGrid()" class="roster-back-btn" title="Zpět na týmy">' + Icons.chevronRight() + '</button>' +
            Statistics.escapeHtml(tym);

        document.getElementById('tymyViewGrid').innerHTML = '<div class="roster-grid">' + cardsHtml + '</div>';
    },

    nahratFotku(hrac, cardIdx) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                localStorage.setItem('photo_' + hrac, ev.target.result);
                const el = document.getElementById('rphoto-' + cardIdx);
                if (el) {
                    el.style.backgroundImage = 'url(' + ev.target.result + ')';
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center top';
                    el.textContent = '';
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    },

    _renderHeroHTML() {
        const zapasy = Data.zapasy['extraliga'] || [];
        const kNorm = k => (k || '').replace(/\.$/, '').trim().toUpperCase();

        const seriesWins = (kolo) => {
            const wins = {}, k = kNorm(kolo);
            zapasy.filter(z => kNorm(z.kolo) === k).forEach(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                if (v.domaci > v.hoste) wins[z.tymDomaci] = (wins[z.tymDomaci] || 0) + 1;
                else if (v.hoste > v.domaci) wins[z.tymHoste] = (wins[z.tymHoste] || 0) + 1;
            });
            return wins;
        };
        const seriesTeams = (kolo) => {
            const t = new Set(), k = kNorm(kolo);
            zapasy.filter(z => kNorm(z.kolo) === k).forEach(z => { t.add(z.tymDomaci); t.add(z.tymHoste); });
            return t;
        };

        const finalTeams = seriesTeams('F');
        if (finalTeams.size === 0) return null;

        const finalWins = seriesWins('F');
        const vitez = Object.entries(finalWins).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!vitez) return null;

        const druhy = [...finalTeams].find(t => t !== vitez) || null;
        const sezóna = Data.rocnik || '';

        // SF losers = SF participants who aren't in the final
        const sfTeams = seriesTeams('SF');
        const sfLosers = [...sfTeams].filter(t => t !== vitez && t !== druhy);

        // 3rd place match (kolo 3M or P3)
        const p3Teams = new Set([...seriesTeams('3M'), ...seriesTeams('P3')]);
        const p3Wins = { ...seriesWins('3M'), ...seriesWins('P3') };
        let treti = null, ctvrty = null;
        if (p3Teams.size > 0) {
            const p3Sorted = Object.entries(p3Wins).sort((a, b) => b[1] - a[1]);
            treti = p3Sorted[0]?.[0] || [...p3Teams][0];
            ctvrty = [...p3Teams].find(t => t !== treti) || null;
        }

        let pillsHtml = '';
        if (druhy) pillsHtml += '<span class="hero-pill"><span class="hero-pill-rank">2.</span> ' + Statistics.escapeHtml(druhy) + '</span>';
        if (treti) {
            pillsHtml += '<span class="hero-pill"><span class="hero-pill-rank">3.</span> ' + Statistics.escapeHtml(treti) + '</span>';
            if (ctvrty) pillsHtml += '<span class="hero-pill"><span class="hero-pill-rank">4.</span> ' + Statistics.escapeHtml(ctvrty) + '</span>';
        } else {
            sfLosers.slice(0, 2).forEach(t => {
                pillsHtml += '<span class="hero-pill"><span class="hero-pill-rank">3.–4.</span> ' + Statistics.escapeHtml(t) + '</span>';
            });
        }

        return '<div class="hero-card">' +
            '<div class="hero-eyebrow">Sezóna ' + Statistics.escapeHtml(sezóna) + ' · Extraliga · Finále</div>' +
            '<div class="hero-title">Mistr ČR<br>je znám</div>' +
            '<div class="hero-champion-box">' +
            '<div class="hero-trophy">' + Icons.trophy() + '</div>' +
            '<div><div class="hero-champion-name">' + Statistics.escapeHtml(vitez) + '</div>' +
            '<div class="hero-champion-label">Mistr České republiky ' + Statistics.escapeHtml(sezóna) + '</div></div>' +
            '</div>' +
            (pillsHtml ? '<div class="hero-pills">' + pillsHtml + '</div>' : '') +
            '</div>';
    },

    _renderHero() {
        const container = document.getElementById('heroContainer');
        if (!container) return;
        if (this.aktualni_soutez !== 'extraliga') { container.style.display = 'none'; return; }
        const html = this._renderHeroHTML();
        if (!html) { container.style.display = 'none'; return; }
        container.innerHTML = html;
        container.style.display = 'block';
    }
};

App.init();
