const App = {
    aktualni_soutez: 'extraliga',
    vybrana_kola: new Set(),
    aktualni_pohled: 'zakladni',

    async init() {
        const success = await Data.nacist();
        if (success) {
            // Read league from URL hash if present
            const hash = window.location.hash.replace('#', '');
            const validSouteze = ['extraliga', 'prvni-liga-vychod', 'prvni-liga-zapad'];
            const soutez = validSouteze.includes(hash) ? hash : 'extraliga';
            this.zmenitSoutez(soutez);
        }

        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeIcon').textContent = '☀️';
            document.getElementById('darkModeText').textContent = 'Light Mode';
        }

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'block') {
                        modal.style.display = 'none';
                    }
                });
            }
        });

        // Handle browser back/forward for league switching
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            const validSouteze = ['extraliga', 'prvni-liga-vychod', 'prvni-liga-zapad'];
            if (validSouteze.includes(hash) && hash !== this.aktualni_soutez) {
                this.zmenitSoutez(hash);
            }
        });
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        document.getElementById('darkModeIcon').textContent = isDark ? '☀️' : '🌙';
        document.getElementById('darkModeText').textContent = isDark ? 'Light Mode' : 'Dark Mode';
    },

    zmenitSoutez(soutez) {
        this.aktualni_soutez = soutez;

        // Update URL hash for shareable links
        if (window.location.hash.replace('#', '') !== soutez) {
            history.replaceState(null, '', '#' + soutez);
        }

        document.querySelectorAll('.soutez-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.classList.add('bg-gray-200', 'text-gray-700');
        });

        const activeTab = document.getElementById('tab-' + soutez);
        activeTab.classList.add('active');
        activeTab.classList.remove('bg-gray-200', 'text-gray-700');

        document.getElementById('tabulkaSoutez').textContent = Data.soutezNazvy[soutez];

        this.vybrana_kola.clear();
        this.aktualizovatSelecty();

        // Reset to základní část view when switching leagues
        this.aktualni_pohled = 'zakladni';
        this.aktualizovatPohledToggle();

        this.zobrazitData();
    },

    prepnoutPohled(pohled) {
        this.aktualni_pohled = pohled;
        this.aktualizovatPohledToggle();

        if (pohled === 'zakladni') {
            document.getElementById('tabulkaObsah').style.display = 'block';
            document.getElementById('playoffObsah').style.display = 'none';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏆';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Tabulka';
        } else {
            document.getElementById('tabulkaObsah').style.display = 'none';
            document.getElementById('playoffObsah').style.display = 'block';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏅';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Play-off pavouk';
            Playoff.render(this.aktualni_soutez);
            Playoff.drawConnectors();
        }
    },

    aktualizovatPohledToggle() {
        const btnZakladni = document.getElementById('viewToggleZakladni');
        const btnPlayoff = document.getElementById('viewTogglePlayoff');
        if (!btnZakladni || !btnPlayoff) return;

        btnZakladni.classList.toggle('active', this.aktualni_pohled === 'zakladni');
        btnPlayoff.classList.toggle('active', this.aktualni_pohled === 'playoff');
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
        if (Data.zapasy[this.aktualni_soutez].length === 0) {
            ['zapasyContainer','statistikyContainer','tabulkaPlayoffContainer','hracMesiceContainer','rychleFiltry','vitezoveContainer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            document.getElementById('prazdnyStav').style.display = 'block';
            return;
        }

        ['zapasyContainer','statistikyContainer','tabulkaPlayoffContainer','hracMesiceContainer','rychleFiltry'].forEach(id =>
            document.getElementById(id).style.display = 'block'
        );
        document.getElementById('prazdnyStav').style.display = 'none';

        // Show champions section only for extraliga and when data exists
        const vitezoveContainer = document.getElementById('vitezoveContainer');
        if (vitezoveContainer) {
            if (this.aktualni_soutez === 'extraliga' && Data.vitezove && Data.vitezove.length > 0) {
                vitezoveContainer.style.display = 'block';
                Champions.render();
            } else {
                vitezoveContainer.style.display = 'none';
            }
        }

        this.aktualizovatKolaCheckboxy();
        this.aktualizovatSelecty();

        Filters.render(this.aktualni_soutez, this.vybrana_kola);
        Players.renderTop3(this.aktualni_soutez, this.vybrana_kola);
        Table.render(this.aktualni_soutez);

        // Render the correct view based on current toggle state
        if (this.aktualni_pohled === 'playoff') {
            document.getElementById('tabulkaObsah').style.display = 'none';
            document.getElementById('playoffObsah').style.display = 'block';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏅';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Play-off pavouk';
            Playoff.render(this.aktualni_soutez);
            Playoff.drawConnectors();
        } else {
            document.getElementById('tabulkaObsah').style.display = 'block';
            document.getElementById('playoffObsah').style.display = 'none';
            document.getElementById('tabulkaPlayoffIcon').textContent = '🏆';
            document.getElementById('tabulkaPlayoffTitle').textContent = 'Tabulka';
        }

        Matches.render(this.aktualni_soutez);
        Players.renderStatistiky(this.aktualni_soutez, this.vybrana_kola);
    }
};

App.init();
