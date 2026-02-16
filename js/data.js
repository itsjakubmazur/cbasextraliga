const Data = {
    zapasy: {
        'extraliga': [],
        'prvni-liga-vychod': [],
        'prvni-liga-zapad': []
    },
    tymy: {
        'extraliga': [],
        'prvni-liga-vychod': [],
        'prvni-liga-zapad': []
    },
    soutezNazvy: {
        'extraliga': 'Extraliga',
        'prvni-liga-vychod': '1. liga - Východ',
        'prvni-liga-zapad': '1. liga - Západ'
    },

    async nacist() {
        try {
            const response = await fetch('badminton-data.json');
            if (!response.ok) throw new Error('Soubor nenalezen');
            const data = await response.json();
            this.zapasy = data.zapasy;
            this.tymy = data.tymy;
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
    }
};