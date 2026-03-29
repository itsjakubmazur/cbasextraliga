const Modals = {
    zobrazitDetailHrace(hrac) {
        // For 1. liga, try the other conference if player not found in current one
        let soutezProHrace = App.aktualni_soutez;
        let stats = Statistics.vypocitejStatistiky(soutezProHrace, App.vybrana_kola);
        let s = stats[hrac];
        if (!s && App.aktualni_soutez.includes('prvni-liga')) {
            soutezProHrace = App.aktualni_soutez === 'prvni-liga-vychod' ? 'prvni-liga-zapad' : 'prvni-liga-vychod';
            stats = Statistics.vypocitejStatistiky(soutezProHrace, new Set());
            s = stats[hrac];
        }
        if (!s) return;

        const modal = document.getElementById('hracModal');
        document.getElementById('modalHracJmeno').textContent = '👤 ' + hrac;

        const winRate = ((s.vyhry / s.zapasy) * 100).toFixed(1);
        const nejTym = Object.keys(s.tymy).length > 0 ? Object.entries(s.tymy).sort((a, b) => b[1] - a[1])[0][0] : '-';
        document.getElementById('modalHracInfo').textContent = nejTym + ' • ' + s.zapasy + ' zápasů • ' + winRate + '% úspěšnost';

        const forma = Statistics.getForma(hrac, Data.zapasy[soutezProHrace]);
        const formaHtml = forma.split('').map(v => '<span class="inline-block w-6 h-6 md:w-8 md:h-8 leading-6 md:leading-8 text-center rounded font-bold text-xs md:text-sm ' + (v === 'V' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') + '">' + v + '</span>').join('');
        
        const zapasyHrace = s.vsechnyZapasy.map(zapas => {
            const v = Statistics.parseVysledek(zapas.vysledek);
            const dh = Statistics.getHraciFromTeam(zapas.domaci);
            const hh = Statistics.getHraciFromTeam(zapas.hoste);
            const jeDom = dh.includes(hrac);
            const vyhral = jeDom ? (v.domaci > v.hoste) : (v.hoste > v.domaci);
            
            // Zjisti partnery a soupeře
            const partneri = jeDom ? dh.filter(h => h !== hrac) : hh.filter(h => h !== hrac);
            const souperi = jeDom ? hh : dh;
            const partnerText = partneri.length > 0 ? ' (s ' + partneri.join(', ') + ')' : '';
            const souperiText = souperi.join(', ');
            
            const koloText = Statistics.isPlayoffKolo(zapas.kolo) ? Statistics.playoffKoloNazev(zapas.kolo) : 'K' + zapas.kolo;
            return '<tr class="border-b text-xs ' + (vyhral ? 'bg-green-50' : 'bg-red-50') + '">' +
                '<td class="p-2">' + koloText + '</td>' +
                '<td class="p-2">' + (zapas.datum || '-') + '</td>' +
                '<td class="p-2">' + zapas.disciplina + '</td>' +
                '<td class="p-2 font-semibold">' + (jeDom ? zapas.tymDomaci : zapas.tymHoste) + partnerText + '</td>' +
                '<td class="p-2">' + (jeDom ? zapas.tymHoste : zapas.tymDomaci) + '</td>' +
                '<td class="p-2 text-gray-600">' + souperiText + '</td>' +
                '<td class="p-2 font-bold ' + (vyhral ? 'text-green-600' : 'text-red-600') + '">' + (vyhral ? '✓ W' : '✗ L') + '</td>' +
                '<td class="p-2 font-semibold">' + zapas.vysledek + '</td>' +
                '<td class="p-2 text-gray-500">' + (zapas.sety || '-') + '</td>' +
                '</tr>';
        }).join('');
        
        const souperiCount = {};
        s.vsechnyZapasy.forEach(z => {
            const dh = Statistics.getHraciFromTeam(z.domaci);
            const hh = Statistics.getHraciFromTeam(z.hoste);
            const souperi = dh.includes(hrac) ? hh : dh;
            souperi.forEach(sp => souperiCount[sp] = (souperiCount[sp] || 0) + 1);
        });
        const nejSouperi = Object.entries(souperiCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sp, poc]) => '<span class="inline-block bg-blue-100 text-blue-800 px-2 md:px-3 py-1 rounded-full text-xs mr-2 mb-2">' + sp + ' (' + poc + 'x)</span>').join('');
        
        document.getElementById('modalHracObsah').innerHTML = 
            '<div class="grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">' +
            '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4"><div class="text-xs text-gray-600 mb-1">Zápasy</div><div class="text-2xl md:text-3xl font-bold text-blue-600">' + s.zapasy + '</div></div>' +
            '<div class="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4"><div class="text-xs text-gray-600 mb-1">Výhry</div><div class="text-2xl md:text-3xl font-bold text-green-600">' + s.vyhry + '</div></div>' +
            '<div class="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4"><div class="text-xs text-gray-600 mb-1">Prohry</div><div class="text-2xl md:text-3xl font-bold text-red-600">' + s.prohry + '</div></div>' +
            '</div>' +
            '<div class="mb-4 md:mb-6"><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">📈 Forma (posledních 5)</h3><div class="flex gap-1 md:gap-2">' + (formaHtml || '<span class="text-gray-500 text-xs">Nedostatek dat</span>') + '</div></div>' +
            '<div class="mb-4 md:mb-6"><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">🎯 Nejčastější soupeři</h3><div>' + (nejSouperi || '<span class="text-gray-500 text-xs">Žádná data</span>') + '</div></div>' +
            '<div><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">📋 Všechny zápasy (' + s.zapasy + ')</h3><div class="overflow-x-auto"><table class="w-full"><thead><tr class="bg-gray-100 border-b-2 text-xs">' +
            '<th class="text-left p-2">Kolo</th><th class="text-left p-2">Datum</th><th class="text-left p-2">Disciplína</th><th class="text-left p-2">Můj tým</th><th class="text-left p-2">Soupeř tým</th><th class="text-left p-2">Soupeři</th><th class="text-left p-2">Výsl.</th><th class="text-left p-2">Sety</th><th class="text-left p-2">Skóre</th>' +
            '</tr></thead><tbody>' + zapasyHrace + '</tbody></table></div></div>';
        modal.style.display = 'block';
    },

    zobrazitDetailTymu(tym) {
        // For 1. liga, try both conferences if team not found in current one
        let soutezProTabulku = App.aktualni_soutez;
        let tabulkaData = Statistics.vypocitejTabulku(soutezProTabulku);
        let t = tabulkaData[tym];
        if (!t && App.aktualni_soutez.includes('prvni-liga')) {
            // Try the other conference
            soutezProTabulku = App.aktualni_soutez === 'prvni-liga-vychod' ? 'prvni-liga-zapad' : 'prvni-liga-vychod';
            tabulkaData = Statistics.vypocitejTabulku(soutezProTabulku);
            t = tabulkaData[tym];
        }
        if (!t) return;

        const modal = document.getElementById('tymModal');
        document.getElementById('modalTymNazev').textContent = '🏆 ' + tym;
        document.getElementById('modalTymInfo').textContent = t.utkani + ' utkání • ' + t.vyhry + 'V / ' + t.remizy + 'R / ' + t.prohry + 'P • ' + t.body + ' bodů';

        // For 1. liga, include matches from the team's conference + playoff pool
        let zapasyTymu;
        if (App.aktualni_soutez.includes('prvni-liga')) {
            const vsechnyZapasy = [
                ...(Data.zapasy[soutezProTabulku] || []),
                ...(Data.zapasy['prvni-liga-playoff'] || [])
            ];
            zapasyTymu = vsechnyZapasy.filter(z => z.tymDomaci === tym || z.tymHoste === tym);
        } else {
            zapasyTymu = Data.zapasy[App.aktualni_soutez].filter(z => z.tymDomaci === tym || z.tymHoste === tym);
        }
        const domaci = zapasyTymu.filter(z => z.tymDomaci === tym);
        const hoste = zapasyTymu.filter(z => z.tymHoste === tym);
        
        let dv = 0, dp = 0, hv = 0, hp = 0;
        domaci.forEach(z => {
            if (Statistics.isNeodehrano(z)) return;
            const v = Statistics.parseVysledek(z.vysledek);
            if (v.domaci > v.hoste) dv++; else dp++;
        });
        hoste.forEach(z => {
            if (Statistics.isNeodehrano(z)) return;
            const v = Statistics.parseVysledek(z.vysledek);
            if (v.hoste > v.domaci) hv++; else hp++;
        });
        
        // Seskupit zápasy podle utkání (kolo + soupeř)
        const utkani = {};
        zapasyTymu.forEach(z => {
            const jeDom = z.tymDomaci === tym;
            const souper = jeDom ? z.tymHoste : z.tymDomaci;
            const klic = z.kolo + '-' + souper;
            if (!utkani[klic]) {
                utkani[klic] = {
                    kolo: z.kolo,
                    datum: z.datum,
                    souper: souper,
                    doma: jeDom,
                    zapasy: []
                };
            }
            utkani[klic].zapasy.push(z);
        });
        
        // Vytvoř HTML pro utkání
        const utkaniHtml = Object.values(utkani).map(u => {
            let vyhraneZapasy = 0, prohraneZapasy = 0;
            u.zapasy.forEach(z => {
                if (Statistics.isNeodehrano(z)) return;
                const v = Statistics.parseVysledek(z.vysledek);
                if (u.doma) {
                    if (v.domaci > v.hoste) vyhraneZapasy++; else prohraneZapasy++;
                } else {
                    if (v.hoste > v.domaci) vyhraneZapasy++; else prohraneZapasy++;
                }
            });
            const remiza = vyhraneZapasy === prohraneZapasy;
            const vyhrano = vyhraneZapasy > prohraneZapasy;
            const bgColor = remiza ? 'bg-yellow-50' : (vyhrano ? 'bg-green-50' : 'bg-red-50');
            const textColor = remiza ? 'text-yellow-600' : (vyhrano ? 'text-green-600' : 'text-red-600');
            const stavText = remiza ? '⚖ Remíza' : (vyhrano ? '✓ Výhra' : '✗ Prohra');

            const koloText = Statistics.isPlayoffKolo(u.kolo) ? Statistics.playoffKoloNazev(u.kolo) : 'K' + u.kolo;
            return '<tr class="border-b ' + bgColor + ' text-xs">' +
                '<td class="p-2">' + koloText + '</td>' +
                '<td class="p-2">' + (u.datum || '-') + '</td>' +
                '<td class="p-2">' + (u.doma ? '🏠 Doma' : '✈️ Venku') + '</td>' +
                '<td class="p-2 font-semibold">' + u.souper + '</td>' +
                '<td class="p-2 font-bold ' + textColor + '">' + vyhraneZapasy + ':' + prohraneZapasy + '</td>' +
                '<td class="p-2">' + stavText + '</td>' +
                '</tr>';
        }).join('');
        
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
        
        const hraciHtml = Object.entries(hraci).sort((a, b) => b[1].zapasy - a[1].zapasy).map(([h, st]) => {
            const wr = ((st.vyhry / st.zapasy) * 100).toFixed(1);
            return '<tr class="border-b hover:bg-gray-50 text-xs">' +
                '<td class="p-2"><span class="clickable" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(h) + '\')">' + Statistics.escapeHtml(h) + '</span></td>' +
                '<td class="p-2 text-center">' + st.zapasy + '</td>' +
                '<td class="p-2 text-center text-green-600 font-semibold">' + st.vyhry + '</td>' +
                '<td class="p-2 text-center text-red-600 font-semibold">' + st.prohry + '</td>' +
                '<td class="p-2 text-center font-bold ' + (parseFloat(wr) >= 50 ? 'text-green-600' : 'text-red-600') + '">' + wr + '%</td>' +
                '</tr>';
        }).join('');
        
        document.getElementById('modalTymObsah').innerHTML = 
            '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">' +
            '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4"><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">🏠 Bilance doma</h3><div class="text-xl md:text-2xl font-bold text-blue-600 mb-2">' + dv + 'V / ' + dp + 'P</div><div class="text-xs md:text-sm text-gray-600">' + domaci.length + ' zápasů</div></div>' +
            '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 md:p-4"><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">✈️ Bilance venku</h3><div class="text-xl md:text-2xl font-bold text-purple-600 mb-2">' + hv + 'V / ' + hp + 'P</div><div class="text-xs md:text-sm text-gray-600">' + hoste.length + ' zápasů</div></div>' +
            '</div>' +
            '<div class="mb-6"><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">📅 Odehraná utkání (' + Object.keys(utkani).length + ')</h3><div class="overflow-x-auto"><table class="w-full"><thead><tr class="bg-gray-100 border-b-2 text-xs">' +
            '<th class="text-left p-2">Kolo</th><th class="text-left p-2">Datum</th><th class="text-left p-2">Místo</th><th class="text-left p-2">Soupeř</th><th class="text-center p-2">Výsledek</th><th class="text-left p-2">Stav</th>' +
            '</tr></thead><tbody>' + utkaniHtml + '</tbody></table></div></div>' +
            '<div><h3 class="text-sm md:text-lg font-bold text-gray-800 mb-3">👥 Hráči týmu (' + Object.keys(hraci).length + ')</h3><div class="overflow-x-auto"><table class="w-full"><thead><tr class="bg-gray-100 border-b-2 text-xs">' +
            '<th class="text-left p-2">Hráč</th><th class="text-center p-2">Z</th><th class="text-center p-2">V</th><th class="text-center p-2">P</th><th class="text-center p-2">Win%</th>' +
            '</tr></thead><tbody>' + hraciHtml + '</tbody></table></div></div>';
        modal.style.display = 'block';
    },

    zobrazitDetailUtkani(result) {
        const modal = document.getElementById('utkaniModal');
        const koloNazev = Statistics.playoffKoloNazev(result.kolo);
        document.getElementById('modalUtkaniNazev').innerHTML =
            koloNazev + ': ' +
            '<span class="clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(result.tym1) + '\')">' + Statistics.escapeHtml(result.tym1) + '</span>' +
            ' vs ' +
            '<span class="clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(result.tym2) + '\')">' + Statistics.escapeHtml(result.tym2) + '</span>';
        document.getElementById('modalUtkaniSkore').textContent = result.skore1 + ' : ' + result.skore2;

        const hracLink = (jmeno) =>
            '<span class="clickable" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(jmeno) + '\')">' + Statistics.escapeHtml(jmeno) + '</span>';

        const hracyHtml = (pole) => {
            if (!pole || pole === 'SKREČ') return '<span class="text-amber-700 font-semibold">SKREČ</span>';
            return Statistics.getHraciFromTeam(pole).map(h => hracLink(h)).join(', ');
        };

        const radky = result.zapasy.map(z => {
            const v = Statistics.parseVysledek(z.vysledek);
            const neodehrano = Statistics.isNeodehrano(z);
            const skrecZapas = Statistics.isSkrec(z);
            const vyhralDomaci = v.domaci > v.hoste;
            const rowCls = neodehrano
                ? 'bg-gray-50 text-gray-400'
                : (skrecZapas ? 'bg-amber-50' : (vyhralDomaci ? 'bg-blue-50' : 'bg-purple-50'));
            return '<tr class="border-b text-xs ' + rowCls + '">' +
                '<td class="p-2">' + Statistics.escapeHtml(z.disciplina || '') + '</td>' +
                '<td class="p-2">' + hracyHtml(z.domaci) + '</td>' +
                '<td class="p-2">' + hracyHtml(z.hoste) + '</td>' +
                '<td class="p-2 text-center font-bold">' + (neodehrano ? '–' : z.vysledek) + '</td>' +
                '<td class="p-2 text-gray-600">' + (z.sety || '–') + '</td>' +
                '</tr>';
        }).join('');

        document.getElementById('modalUtkaniObsah').innerHTML =
            '<div class="overflow-x-auto"><table class="w-full">' +
            '<thead><tr class="bg-gray-100 border-b-2 text-xs">' +
            '<th class="text-left p-2">Disciplína</th>' +
            '<th class="text-left p-2">Domácí</th>' +
            '<th class="text-left p-2">Hosté</th>' +
            '<th class="text-center p-2">Výsl.</th>' +
            '<th class="text-left p-2">Skóre</th>' +
            '</tr></thead><tbody>' + radky + '</tbody></table></div>';

        modal.style.display = 'block';
    },

    zavritModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};