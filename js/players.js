const Players = {
    renderTop3(aktualni_soutez, vybrana_kola) {
        const vsechnaKola = [...new Set(Data.zapasy[aktualni_soutez].map(z => z.kolo))].sort((a, b) => parseInt(b) - parseInt(a));

        const kolaCheckboxy = vsechnaKola.map(kolo =>
            '<label class="kolo-checkbox flex items-center gap-1 px-1.5 py-0.5 border ' +
            (vybrana_kola.size === 0 || vybrana_kola.has(kolo) ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white') +
            ' rounded cursor-pointer hover:border-blue-400 transition-all">' +
            '<input type="checkbox" value="' + kolo + '" onchange="Players.toggleKoloTop3(\'' + kolo + '\')" ' +
            (vybrana_kola.size === 0 || vybrana_kola.has(kolo) ? 'checked' : '') +
            ' class="w-3 h-3">' +
            '<span class="text-xs font-medium">' + kolo + '</span>' +
            '</label>'
        ).join('');

        const kolaLabel = vybrana_kola.size === 0 ? 'Všechna kola' : vybrana_kola.size + '/' + vsechnaKola.length + ' kol';
        const filterHtml = '<div class="mb-3">' +
            '<div class="flex flex-wrap items-center gap-2">' +
            '<button onclick="Players.toggleTop3Filtr()" class="text-xs px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 font-medium">Filtr kol: ' + kolaLabel + ' ▾</button>' +
            '<button onclick="Players.poslednichXKolTop3(2)" class="text-xs px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100">Poslední 2</button>' +
            '<button onclick="Players.vyberVsechnaKolaTop3()" class="text-xs px-2 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded hover:bg-gray-100">Vše</button>' +
            '</div>' +
            '<div id="top3KolaPanel" class="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2" style="display:none;">' +
            '<div class="flex flex-wrap gap-1">' + kolaCheckboxy + '</div>' +
            '</div>' +
            '</div>';

        const stats = Statistics.vypocitejStatistiky(aktualni_soutez, vybrana_kola);
        const hraciList = Object.keys(stats).filter(h => stats[h].zapasy >= 1);

        Statistics.seraditHraceStandardne(hraciList, stats);

        const top3 = hraciList.slice(0, 3);

        if (top3.length === 0) {
            document.getElementById('hracMesiceContainer').innerHTML =
                '<div class="flex items-center justify-between mb-2"><h2 class="text-sm md:text-base font-bold text-gray-800">🔥 TOP 3 Hráči</h2></div>' +
                filterHtml +
                '<p class="text-gray-500 text-xs">Žádní hráči pro vybraná kola</p>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['border-yellow-400 bg-yellow-50', 'border-gray-300 bg-gray-50', 'border-orange-300 bg-orange-50'];

        const html = top3.map((hrac, idx) => {
            const s = stats[hrac];
            const winRate = ((s.vyhry / s.zapasy) * 100).toFixed(1);
            return '<div class="border ' + colors[idx] + ' rounded-lg p-2 md:p-3 text-center cursor-pointer hover:shadow-md transition-all min-w-0" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(hrac) + '\')">' +
                '<div class="text-lg md:text-xl leading-none">' + medals[idx] + '</div>' +
                '<div class="font-bold text-xs md:text-sm text-gray-800 mt-1 truncate">' + Statistics.escapeHtml(hrac) + '</div>' +
                '<div class="text-sm md:text-lg font-bold text-blue-600 leading-tight">' + winRate + '%</div>' +
                '<div class="text-xs text-gray-500 leading-tight">' + s.vyhry + 'V/' + s.prohry + 'P · ' + s.zapasy + 'z</div>' +
                '</div>';
        }).join('');

        document.getElementById('hracMesiceContainer').innerHTML =
            '<div class="flex items-center justify-between mb-2"><h2 class="text-sm md:text-base font-bold text-gray-800">🔥 TOP 3 Hráči</h2></div>' +
            filterHtml +
            '<div class="grid grid-cols-3 gap-2 md:gap-3">' + html + '</div>';
    },

    toggleTop3Filtr() {
        const panel = document.getElementById('top3KolaPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    toggleKoloTop3(kolo) {
        if (App.vybrana_kola.has(kolo)) {
            App.vybrana_kola.delete(kolo);
        } else {
            App.vybrana_kola.add(kolo);
        }
        // Pouze překresli TOP 3, ne celou stránku
        this.renderTop3(App.aktualni_soutez, App.vybrana_kola);
    },

    vyberVsechnaKolaTop3() {
        App.vybrana_kola.clear();
        this.renderTop3(App.aktualni_soutez, App.vybrana_kola);
        App.aktualizovatKolaCheckboxy();
        Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola);
    },

    zrusVsechnaKolaTop3() {
        App.vybrana_kola = new Set();
        this.renderTop3(App.aktualni_soutez, App.vybrana_kola);
        App.aktualizovatKolaCheckboxy();
        Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola);
    },

    poslednichXKolTop3(pocet) {
        const vsechnaKola = [...new Set(Data.zapasy[App.aktualni_soutez].map(z => z.kolo))].sort((a, b) => parseInt(b) - parseInt(a));
        App.vybrana_kola = new Set(vsechnaKola.slice(0, pocet));
        this.renderTop3(App.aktualni_soutez, App.vybrana_kola);
        App.aktualizovatKolaCheckboxy();
        Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola);
    },

    renderStatistiky(aktualni_soutez, vybrana_kola) {
        const stats = Statistics.vypocitejStatistiky(aktualni_soutez, vybrana_kola);
        let hraciList = Object.keys(stats);
        
        // Uložení aktuálních hodnot filtrů před překreslením
        const hledatHraceEl = document.getElementById('hledatHrace');
        const hledatHodnota = hledatHraceEl?.value || '';
        const hledatText = hledatHodnota.toLowerCase();
        const bylFokus = document.activeElement === hledatHraceEl;
        const kurzorPozice = hledatHraceEl?.selectionStart || 0;
        const minZapasyHodnota = document.getElementById('minZapasy')?.value || '0';
        const minZapasy = parseInt(minZapasyHodnota) || 0;
        const razeniSloupec = document.getElementById('razeniSloupec')?.value || 'winrate';
        const filtrTymHodnota = document.getElementById('filtrTym')?.value || '';
        const filtrDisciplinaHodnota = document.getElementById('filtrDisciplina')?.value || '';
        
        if (hledatText) hraciList = hraciList.filter(hrac => hrac.toLowerCase().includes(hledatText));
        if (minZapasy > 0) hraciList = hraciList.filter(hrac => stats[hrac].zapasy >= minZapasy);
        
        if (razeniSloupec === 'winrate') {
            Statistics.seraditHraceStandardne(hraciList, stats);
        } else {
            hraciList.sort((a, b) => {
                const sA = stats[a];
                const sB = stats[b];
                switch(razeniSloupec) {
                    case 'zapasy': return sB.zapasy - sA.zapasy;
                    case 'vyhry': return sB.vyhry - sA.vyhry;
                    case 'jmeno': return a.localeCompare(b, 'cs');
                    default: return 0;
                }
            });
        }
        
        const rows = hraciList.map((hrac, idx) => {
            const s = stats[hrac];
            const winRatio = s.zapasy > 0 ? ((s.vyhry / s.zapasy) * 100).toFixed(1) : '0.0';
            const nejTym = Object.keys(s.tymy).length > 0 ? Object.entries(s.tymy).sort((a, b) => b[1] - a[1])[0][0] : '-';
            const winColor = parseFloat(winRatio) >= 50 ? 'text-green-600' : 'text-red-600';
            const forma = Statistics.getForma(hrac, Statistics.getZapasyProSoutez(aktualni_soutez));
            const formaHtml = forma.split('').map(v => '<span class="inline-block w-5 h-5 leading-5 text-center rounded font-bold text-xs ' + (v === 'V' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') + '">' + v + '</span>').join(' ');
            
            return '<tr class="border-b border-gray-200 hover:bg-blue-50"><td class="p-2 text-center font-bold text-gray-500">' + (idx + 1) + '</td><td class="p-2 font-semibold clickable" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(hrac) + '\')">' + Statistics.escapeHtml(hrac) + '</td><td class="p-2 text-blue-600 clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(nejTym) + '\')">' + Statistics.escapeHtml(nejTym) + '</td><td class="p-2 text-center">' + s.zapasy + '</td><td class="p-2 text-center text-green-600 font-semibold">' + s.vyhry + '</td><td class="p-2 text-center text-red-600 font-semibold">' + s.prohry + '</td><td class="p-2 text-center font-bold ' + winColor + '">' + winRatio + '%</td><td class="p-2 text-center">' + (formaHtml || '-') + '</td></tr>';
        }).join('');
        
        const tymyOptions = Data.tymy[aktualni_soutez].map(t => '<option value="' + t + '"' + (t === filtrTymHodnota ? ' selected' : '') + '>' + t + '</option>').join('');
        
        const filtryHtml = '<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 mb-4">' +
            '<h3 class="text-xs md:text-sm font-semibold text-gray-700 mb-3">🔍 Filtry</h3>' +
            '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">' +
            '<div><label class="block text-xs font-medium text-gray-600 mb-1">Hráč</label>' +
            '<input type="text" id="hledatHrace" placeholder="Jméno..." value="' + hledatHodnota.replace(/"/g, '&quot;') + '" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" oninput="Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola)"></div>' +
            '<div><label class="block text-xs font-medium text-gray-600 mb-1">Tým</label>' +
            '<select id="filtrTym" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" onchange="App.zobrazitData()">' +
            '<option value="">Všechny týmy</option>' + tymyOptions + '</select></div>' +
            '<div><label class="block text-xs font-medium text-gray-600 mb-1">Disciplína</label>' +
            '<select id="filtrDisciplina" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" onchange="App.zobrazitData()">' +
            '<option value="">Vše</option><option value="dvouhra"' + (filtrDisciplinaHodnota === 'dvouhra' ? ' selected' : '') + '>Dvouhry</option><option value="ctyrhra"' + (filtrDisciplinaHodnota === 'ctyrhra' ? ' selected' : '') + '>Čtyřhry</option></select></div>' +
            '<div><label class="block text-xs font-medium text-gray-600 mb-1">Min. zápasů</label>' +
            '<input type="number" id="minZapasy" value="' + minZapasyHodnota + '" min="0" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" oninput="Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola)"></div>' +
            '<div><label class="block text-xs font-medium text-gray-600 mb-1">Řadit</label>' +
            '<select id="razeniSloupec" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" onchange="Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola)">' +
            '<option value="winrate"' + (razeniSloupec === 'winrate' ? ' selected' : '') + '>Win %</option><option value="zapasy"' + (razeniSloupec === 'zapasy' ? ' selected' : '') + '>Zápasy</option><option value="vyhry"' + (razeniSloupec === 'vyhry' ? ' selected' : '') + '>Výhry</option><option value="jmeno"' + (razeniSloupec === 'jmeno' ? ' selected' : '') + '>Jméno</option></select></div>' +
            '<div class="flex items-end"><button onclick="Filters.vymazat()" class="w-full bg-gray-500 hover:bg-gray-600 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded transition-colors">✕ Reset</button></div>' +
            '</div>' +
            '<div class="border-t border-gray-300 pt-3 mt-3">' +
            '<div class="flex justify-between items-center mb-2">' +
            '<label class="text-xs font-medium text-gray-600">Kola</label>' +
            '<div class="flex gap-2">' +
            '<button onclick="Filters.vyberVsechna()" class="text-xs text-blue-600 hover:text-blue-800">Vše</button>' +
            '<button onclick="Filters.zrusVsechna()" class="text-xs text-red-600 hover:text-red-800">Žádné</button>' +
            '</div></div>' +
            '<div id="kolaCheckboxy" class="flex flex-wrap gap-2"></div>' +
            '</div></div>';
        
        document.getElementById('statistikyObsah').innerHTML = filtryHtml + 
            '<div class="overflow-x-auto"><table class="w-full text-xs">' +
            '<thead><tr class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">' +
            '<th class="text-center p-2 font-semibold">#</th>' +
            '<th class="text-left p-2 font-semibold">Hráč</th>' +
            '<th class="text-left p-2 font-semibold">Tým</th>' +
            '<th class="text-center p-2 font-semibold">Z</th>' +
            '<th class="text-center p-2 font-semibold">V</th>' +
            '<th class="text-center p-2 font-semibold">P</th>' +
            '<th class="text-center p-2 font-semibold">Win%</th>' +
            '<th class="text-center p-2 font-semibold">Forma</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';

        // Vykreslení checkboxů kol (musí být po innerHTML, protože ten vytváří nový #kolaCheckboxy)
        Filters.renderKolaCheckboxy(aktualni_soutez, vybrana_kola);

        // Obnovení fokusu na vyhledávací pole po překreslení
        if (bylFokus) {
            const el = document.getElementById('hledatHrace');
            if (el) {
                el.focus();
                el.setSelectionRange(kurzorPozice, kurzorPozice);
            }
        }
    },

    // Renders player statistics from an explicit array of matches (used for historical playoff stats).
    renderStatistikyZapasy(zapasy) {
        const stats = {};
        zapasy.forEach(zapas => {
            if (Statistics.isNeodehrano(zapas)) return;
            const v = Statistics.parseVysledek(zapas.vysledek);
            const domaciVyhral = v.domaci > v.hoste;
            const domaciSkrecovali = zapas.domaci === 'SKREČ';
            const hosteSkrecovali = zapas.hoste === 'SKREČ';

            const pridatHrace = (jmena, vyhral, tym) => {
                jmena.split(',').map(h => h.trim()).filter(h => h).forEach(hrac => {
                    if (!stats[hrac]) stats[hrac] = { zapasy: 0, vyhry: 0, prohry: 0, tymy: {} };
                    stats[hrac].zapasy++;
                    if (vyhral) stats[hrac].vyhry++; else stats[hrac].prohry++;
                    if (tym) stats[hrac].tymy[tym] = (stats[hrac].tymy[tym] || 0) + 1;
                });
            };

            if (!domaciSkrecovali) pridatHrace(zapas.domaci, domaciVyhral, zapas.tymDomaci);
            if (!hosteSkrecovali) pridatHrace(zapas.hoste, !domaciVyhral, zapas.tymHoste);
        });

        const hraciList = Object.keys(stats).filter(h => stats[h].zapasy >= 1);
        Statistics.seraditHraceStandardne(hraciList, stats);

        if (hraciList.length === 0) return '<p class="text-gray-500 text-sm">Žádná data.</p>';

        const rows = hraciList.map((hrac, idx) => {
            const s = stats[hrac];
            const winRatio = s.zapasy > 0 ? ((s.vyhry / s.zapasy) * 100).toFixed(1) : '0.0';
            const nejTym = Object.keys(s.tymy).length > 0 ? Object.entries(s.tymy).sort((a, b) => b[1] - a[1])[0][0] : '-';
            const winColor = parseFloat(winRatio) >= 50 ? 'text-green-600' : 'text-red-600';
            return '<tr class="border-b border-gray-200 hover:bg-blue-50">' +
                '<td class="p-2 text-center font-bold text-gray-500">' + (idx + 1) + '</td>' +
                '<td class="p-2 font-semibold">' + Statistics.escapeHtml(hrac) + '</td>' +
                '<td class="p-2 text-blue-600">' + Statistics.escapeHtml(nejTym) + '</td>' +
                '<td class="p-2 text-center">' + s.zapasy + '</td>' +
                '<td class="p-2 text-center text-green-600 font-semibold">' + s.vyhry + '</td>' +
                '<td class="p-2 text-center text-red-600 font-semibold">' + s.prohry + '</td>' +
                '<td class="p-2 text-center font-bold ' + winColor + '">' + winRatio + '%</td>' +
                '</tr>';
        }).join('');

        return '<div class="overflow-x-auto"><table class="w-full text-xs">' +
            '<thead><tr class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">' +
            '<th class="text-center p-2">#</th>' +
            '<th class="text-left p-2">Hráč</th>' +
            '<th class="text-left p-2">Tým</th>' +
            '<th class="text-center p-2">Z</th>' +
            '<th class="text-center p-2">V</th>' +
            '<th class="text-center p-2">P</th>' +
            '<th class="text-center p-2">Win%</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
};