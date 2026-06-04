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
            const datumAktualizace = data.datum ? new Date(data.datum).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'neznámé';
            document.getElementById('aktualizaceInfo').textContent = '✓ Aktualizace: ' + datumAktualizace;
            return true;
        } catch (error) {
            console.error('Chyba:', error);
            document.getElementById('aktualizaceInfo').textContent = '❌ Chyba načítání';
            document.getElementById('prazdnyStav').innerHTML =
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
        if (!rocnik || rocnik === 'current') return {
            extraliga_playoff: 'QF+SF+F',
            prvni_liga_playoff: 'combined-8',
            baraze: 'single'
        };
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
