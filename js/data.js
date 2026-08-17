const Data = {
    zapasy: {
        'extraliga': [],
        'prvni-liga-vychod': [],
        'prvni-liga-zapad': [],
        'prvni-liga-playoff': [],
        'baraze': []
    },
    tymy: {
        'extraliga': [],
        'prvni-liga-vychod': [],
        'prvni-liga-zapad': [],
        'prvni-liga-playoff': [],
        'baraze': []
    },
    soutezNazvy: {
        'extraliga': 'Extraliga',
        'prvni-liga-vychod': '1. liga - Východ',
        'prvni-liga-zapad': '1. liga - Západ',
        'prvni-liga-playoff': '1. liga - Play-off',
        'baraze': 'Baráž'
    },
    vitezove: [],
    historickeRocniky: {},
    rocnik: null,
    konfigurace: null,
    tymLoga: {},
    _dataBackup: null,

    async nacist() {
        try {
            const response = await fetch('badminton-data.json');
            if (!response.ok) throw new Error('Soubor nenalezen');
            const data = await response.json();
            this.zapasy = { ...this.zapasy, ...data.zapasy };
            this.tymy = { ...this.tymy, ...data.tymy };
            if (data.vitezove) this.vitezove = data.vitezove;
            if (data.historicke_rocniky) this.historickeRocniky = data.historicke_rocniky;
            if (data.rocnik) this.rocnik = data.rocnik;
            if (data.konfigurace) this.konfigurace = data.konfigurace;
            if (data.tymLoga) this.tymLoga = data.tymLoga;
            const datumAktualizace = data.datum ? new Date(data.datum).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'neznámé';
            const aktualizaceEl = document.getElementById('aktualizaceInfo');
            if (aktualizaceEl) aktualizaceEl.textContent = '✓ Aktualizace: ' + datumAktualizace;
            return true;
        } catch (error) {
            console.error('Chyba:', error);
            const aktualizaceEl = document.getElementById('aktualizaceInfo');
            if (aktualizaceEl) aktualizaceEl.textContent = '❌ Chyba načítání';
            const prazdnyStavEl = document.getElementById('prazdnyStav');
            if (prazdnyStavEl) prazdnyStavEl.innerHTML =
                '<div class="text-6xl mb-4">⚠️</div>' +
                '<h3 class="text-xl font-semibold text-gray-700 mb-2">Chyba</h3>' +
                '<p class="text-gray-500">Soubor badminton-data.json nenalezen</p>';
            return false;
        }
    },

    getHistorickeRocniky() {
        return Object.keys(this.historickeRocniky).sort((a, b) => b.localeCompare(a));
    },

    getKonfigurace(rocnik) {
        if (!rocnik || rocnik === 'current') {
            // this.konfigurace se naplni z badminton-data.json v nacist(); tenhle
            // literal je jen zaloha pro pripad starsiho JSONu bez migrace.
            return this.konfigurace || {
                extraliga_playoff: 'QF+SF+F',
                prvni_liga_playoff: 'combined-8',
                baraze: 'single'
            };
        }
        const r = this.historickeRocniky[rocnik];
        return (r && r.konfigurace) ? r.konfigurace : {};
    },

    // Activate a historical season – swaps Data.zapasy/tymy so all existing code works.
    // Pass null to restore current season.
    aktivovatRocnik(rocnik) {
        // Always restore from backup first
        if (this._dataBackup) {
            this.zapasy = this._dataBackup.zapasy;
            this.tymy = this._dataBackup.tymy;
            this._dataBackup = null;
        }
        if (!rocnik) return;

        const hist = this.historickeRocniky[rocnik];
        if (!hist) return;

        this._dataBackup = { zapasy: this.zapasy, tymy: this.tymy };

        const emptyZapasy = { 'extraliga': [], 'prvni-liga-vychod': [], 'prvni-liga-zapad': [], 'prvni-liga-playoff': [], 'baraze': [] };
        this.zapasy = { ...emptyZapasy, ...hist.zapasy };
        this.tymy = { ...this.tymy, ...(hist.tymy || {}) };
    }
};
