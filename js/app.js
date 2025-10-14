const App = {
    aktualni_soutez: 'extraliga',
    vybrana_kola: new Set(),

    async init() {
        const success = await Data.nacist();
        if (success) {
            this.zmenitSoutez('extraliga');
        }
        
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeIcon').textContent = '☀️';
            document.getElementById('darkModeText').textContent = 'Light Mode';
        }
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
        this.zobrazitData();
    },

    toggleSekce(id) {
        const obsah = document.getElementById(id);
        const toggle = document.getElementById(id.replace('Obsah', 'Toggle'));
        
        if (obsah.style.display === 'none') {
            obsah.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            obsah.style.display = 'none';
            toggle.textContent = '▶';
        }
    },

    aktualizovatSelecty() {
        const filtrTym = document.getElementById('filtrTym');
        if (filtrTym) {
            const currentFiltr = filtrTym.value;
            filtrTym.innerHTML = '<option value="">Všechny týmy</option>' + 
                Data.tymy[this.aktualni_soutez].map(t => '<option value="' + t + '">' + t + '</option>').join('');
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
            ['zapasyContainer','statistikyContainer','tabulkaContainer','hracMesiceContainer','rychleFiltry'].forEach(id => 
                document.getElementById(id).style.display = 'none'
            );
            document.getElementById('prazdnyStav').style.display = 'block';
            return;
        }

        ['zapasyContainer','statistikyContainer','tabulkaContainer','hracMesiceContainer','rychleFiltry'].forEach(id => 
            document.getElementById(id).style.display = 'block'
        );
        document.getElementById('prazdnyStav').style.display = 'none';

        this.aktualizovatKolaCheckboxy();
        this.aktualizovatSelecty();
        
        Filters.render(this.aktualni_soutez, this.vybrana_kola);
        Players.renderTop3(this.aktualni_soutez, this.vybrana_kola);
        Table.render(this.aktualni_soutez);
        Matches.render(this.aktualni_soutez);
        Players.renderStatistiky(this.aktualni_soutez, this.vybrana_kola);
    }
};

App.init();