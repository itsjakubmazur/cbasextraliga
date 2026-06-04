const App = {
    aktualni_soutez: 'extraliga',
    vybrana_kola: new Set(),
    aktualni_pohled: 'zakladni',
    aktualni_rocnik: null,          // null = current season, string = historical
    aktualni_historicky_pohled: 'extraliga',  // 'extraliga' | 'liga' | 'baraze'

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
            if (icon) icon.textContent = '☀️';
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
            btn.className = 'rocnik-btn px-3 py-1 rounded-full text-xs font-semibold border transition-colors';
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
            if (isActive) {
                btn.style.cssText = 'background:#d93831;color:white;border-color:#d93831;';
            } else {
                btn.style.cssText = 'background:white;color:#374151;border-color:#d1d5db;';
                btn.onmouseover = () => { btn.style.background = '#f3f4f6'; };
                btn.onmouseout = () => { btn.style.background = 'white'; };
            }
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
            const isActive = p === pohled;
            btn.className = 'soutez-tab px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base' +
                (isActive ? ' active' : ' bg-gray-200 text-gray-700');
        });

        const container = document.getElementById('historickyContainer');
        const nadpis = document.getElementById('historickyNadpis');
        const pavoucek = document.getElementById('historickyPavoucek');
        const statContainer = document.getElementById('historickyStatContainer');

        if (!container || !pavoucek) return;

        container.style.display = 'block';

        if (pohled === 'baraze') {
            nadpis.textContent = '⚔️ Baráž – ' + (this.aktualni_rocnik || '').replace('-', '/');
            pavoucek.innerHTML = Playoff.renderBaraze();
            statContainer.style.display = 'none';
        } else if (pohled === 'extraliga') {
            nadpis.textContent = '🏆 Extraliga play-off – ' + (this.aktualni_rocnik || '').replace('-', '/');
            pavoucek.innerHTML = this._renderHistorickyPlayoff('extraliga');
            Playoff.drawConnectors();
            this._renderHistorickyStatistiky('extraliga');
        } else {
            nadpis.textContent = '🥈 1. liga play-off – ' + (this.aktualni_rocnik || '').replace('-', '/');
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
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
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
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏆';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Tabulka';
        } else if (pohled === 'playoff') {
            playoffObsah.style.display = 'block';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏅';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Play-off pavouk';
            Playoff.render(this.aktualni_soutez);
            Playoff.drawConnectors();
        } else if (pohled === 'baraze') {
            barazeObsah.style.display = 'block';
            document.getElementById('tabulkaPlayoffIcon').textContent = '⚔️';
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

        Filters.render(this.aktualni_soutez, this.vybrana_kola);
        Players.renderTop3(this.aktualni_soutez, this.vybrana_kola);
        Table.render(this.aktualni_soutez);

        if (this.aktualni_pohled === 'playoff') {
            document.getElementById('tabulkaObsah').style.display = 'none';
            document.getElementById('playoffObsah').style.display = 'block';
            document.getElementById('barazeObsah').style.display = 'none';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏅';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Play-off pavouk';
            Playoff.render(this.aktualni_soutez);
            Playoff.drawConnectors();
        } else if (this.aktualni_pohled === 'baraze') {
            document.getElementById('tabulkaObsah').style.display = 'none';
            document.getElementById('playoffObsah').style.display = 'none';
            document.getElementById('barazeObsah').style.display = 'block';
            document.getElementById('tabulkaPlayoffIcon').textContent = '⚔️';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Baráž';
            document.getElementById('barazeObsah').innerHTML = Playoff.renderBaraze();
        } else {
            document.getElementById('tabulkaObsah').style.display = 'block';
            document.getElementById('playoffObsah').style.display = 'none';
            document.getElementById('barazeObsah').style.display = 'none';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏆';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Tabulka';
        }

        Matches.render(this.aktualni_soutez);
        Players.renderStatistiky(this.aktualni_soutez, this.vybrana_kola);
    }
};

App.init();
