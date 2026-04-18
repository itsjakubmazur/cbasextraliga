const Filters = {
    render(aktualni_soutez, vybrana_kola) {
        const container = document.getElementById('rychleFiltry');
        if (!container) return;

        container.innerHTML = `
            <div class="flex flex-wrap gap-2">
                <button onclick="Filters.poslednichXKol(1)" class="px-3 md:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs md:text-sm">
                    📅 Poslední kolo
                </button>
                <button onclick="Filters.poslednichXKol(3)" class="px-3 md:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs md:text-sm">
                    📅 3 kola
                </button>
                <button onclick="Filters.aktualniKolo()" class="px-3 md:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs md:text-sm">
                    ⚡ Aktuální
                </button>
                <button onclick="Filters.vybrátPlayoff()" class="px-3 md:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs md:text-sm">
                    🏅 Play-off
                </button>
                <button onclick="Filters.vymazat()" class="px-3 md:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs md:text-sm">
                    ✕ Vše
                </button>
            </div>
        `;
    },

    _numerickaKola(aktualni_soutez) {
        return [...new Set(Data.zapasy[aktualni_soutez].map(z => z.kolo))]
            .filter(k => !Statistics.isPlayoffKolo(k))
            .sort((a, b) => parseInt(b) - parseInt(a));
    },

    poslednichXKol(pocet) {
        const kola = this._numerickaKola(App.aktualni_soutez);
        App.vybrana_kola = new Set(kola.slice(0, pocet));
        App.aktualizovatKolaCheckboxy();
        App.zobrazitData();
    },

    aktualniKolo() {
        const kola = this._numerickaKola(App.aktualni_soutez);
        if (kola.length > 0) {
            App.vybrana_kola = new Set([kola[0]]);
            App.aktualizovatKolaCheckboxy();
            App.zobrazitData();
        }
    },

    vybrátPlayoff() {
        const playoffKola = new Set(['QF', 'SF', 'F', 'P5']);
        App.vybrana_kola = playoffKola;
        App.aktualizovatKolaCheckboxy();
        App.zobrazitData();
    },

    vymazat() {
        const hledatHrace = document.getElementById('hledatHrace');
        const filtrTym = document.getElementById('filtrTym');
        const filtrDisciplina = document.getElementById('filtrDisciplina');
        const minZapasy = document.getElementById('minZapasy');
        const razeniSloupec = document.getElementById('razeniSloupec');
        
        if (hledatHrace) hledatHrace.value = '';
        if (filtrTym) filtrTym.value = '';
        if (filtrDisciplina) filtrDisciplina.value = '';
        if (minZapasy) minZapasy.value = '0';
        if (razeniSloupec) razeniSloupec.value = 'winrate';
        
        App.vybrana_kola.clear();
        App.aktualizovatKolaCheckboxy();
        App.zobrazitData();
    },

    renderKolaCheckboxy(aktualni_soutez, vybrana_kola) {
        const container = document.getElementById('kolaCheckboxy');
        if (!container) return;

        // Only numeric (non-playoff) kola in checkboxes – playoff má vlastní tlačítko
        const vsechnaKola = [...new Set(Data.zapasy[aktualni_soutez].map(z => z.kolo))]
            .filter(k => !Statistics.isPlayoffKolo(k));

        if (vsechnaKola.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-500">Žádná kola</span>';
            return;
        }

        vsechnaKola.sort((a, b) => parseInt(a) - parseInt(b));

        container.innerHTML = vsechnaKola.map(kolo =>
            `<label class="kolo-checkbox flex items-center gap-1 px-2 py-1 border border-gray-300 rounded bg-white text-xs">
                <input type="checkbox" value="${kolo}" onchange="Filters.toggleKolo('${kolo}')"
                    ${vybrana_kola.size === 0 || vybrana_kola.has(kolo) ? 'checked' : ''} class="w-3 h-3">
                <span>K${kolo}</span>
            </label>`
        ).join('');
    },

    toggleKolo(kolo) {
        if (App.vybrana_kola.has(kolo)) {
            App.vybrana_kola.delete(kolo);
        } else {
            App.vybrana_kola.add(kolo);
        }
        App.zobrazitData();
    },

    vyberVsechna() {
        App.vybrana_kola.clear();
        this.renderKolaCheckboxy(App.aktualni_soutez, App.vybrana_kola);
        App.zobrazitData();
    },

    zrusVsechna() {
        App.vybrana_kola = new Set();
        const checkboxy = document.querySelectorAll('#kolaCheckboxy input[type="checkbox"]');
        checkboxy.forEach(cb => cb.checked = false);
        App.zobrazitData();
    }
};