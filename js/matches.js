const Matches = {
    render(aktualni_soutez) {
        // For 1. liga, include playoff matches from shared playoff pool
        let zapasyKZobrazeni = [...Data.zapasy[aktualni_soutez]];
        const jePrvniLiga = aktualni_soutez.includes('prvni-liga') && aktualni_soutez !== 'prvni-liga-playoff';
        if (jePrvniLiga && Data.zapasy['prvni-liga-playoff']?.length > 0) {
            zapasyKZobrazeni = zapasyKZobrazeni.concat(Data.zapasy['prvni-liga-playoff']);
        }

        document.getElementById('pocetZapasu').textContent = zapasyKZobrazeni.filter(z => !Statistics.isNeodehrano(z)).length;

        // Seskupit zápasy podle utkání (kolo + týmy)
        const utkani = {};
        zapasyKZobrazeni.forEach(zapas => {
            const klic = zapas.kolo + '-' + zapas.tymDomaci + '-' + zapas.tymHoste;
            if (!utkani[klic]) {
                utkani[klic] = {
                    kolo: zapas.kolo,
                    datum: zapas.datum,
                    tymDomaci: zapas.tymDomaci,
                    tymHoste: zapas.tymHoste,
                    zapasy: []
                };
            }
            utkani[klic].zapasy.push(zapas);
        });
        
        // Vytvoř HTML pro každé utkání
        const utkaniHtml = Object.values(utkani).map((utk, idx) => {
            // Spočítej celkový výsledek utkání
            let domaciVyhry = 0, hosteVyhry = 0;
            utk.zapasy.forEach(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                if (v.domaci === 0 && v.hoste === 0) return; // neodehraný zápas
                if (v.domaci > v.hoste) domaciVyhry++;
                else hosteVyhry++;
            });

            const domaciVyhral = domaciVyhry > hosteVyhry;
            const vysledekClass = domaciVyhral ? 'match-score-home' : 'match-score-away';

            // Detail zápasů (defaultně skrytý)
            const detailZapasy = utk.zapasy.map(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                const neodehrano = Statistics.isNeodehrano(z);
                const skrecZapas = Statistics.isSkrec(z);
                const vyhralDomaci = v.domaci > v.hoste;
                const rowCls = neodehrano
                    ? 'match-detail-pending'
                    : (skrecZapas ? 'match-detail-screc' : (vyhralDomaci ? 'match-detail-home' : 'match-detail-away'));
                const skrecBadge = skrecZapas ? ' <span class="text-xs font-semibold text-amber-700">(SKREČ)</span>' : '';
                return '<tr class="text-xs ' + rowCls + '">' +
                    '<td class="p-2 pl-8">' + z.disciplina + '</td>' +
                    '<td class="p-2">' + z.domaci + skrecBadge + '</td>' +
                    '<td class="p-2">' + z.hoste + '</td>' +
                    '<td class="p-2 text-center font-bold">' + (neodehrano ? '–' : z.vysledek) + '</td>' +
                    '<td class="p-2 text-xs text-gray-600">' + (z.sety || '–') + '</td>' +
                    '</tr>';
            }).join('');
            
            const jePlayoff = Statistics.isPlayoffKolo(utk.kolo);
            const koloLabel = jePlayoff ? Statistics.playoffKoloNazev(utk.kolo) : 'Kolo ' + utk.kolo;
            const rowCls = jePlayoff ? 'match-row match-row-playoff' : 'match-row';

            return '<tbody>' +
                '<tr class="' + rowCls + ' cursor-pointer" onclick="Matches.toggleDetail(\'detail-' + idx + '\')">' +
                '<td class="p-3 match-kolo-cell">' + koloLabel + '</td>' +
                '<td class="p-3 match-datum-cell">' + (utk.datum || '–') + '</td>' +
                '<td class="p-3 match-tym-cell clickable" onclick="event.stopPropagation(); Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(utk.tymDomaci) + '\')">' + Statistics.escapeHtml(utk.tymDomaci) + '</td>' +
                '<td class="p-3 text-center match-score ' + vysledekClass + '">' + domaciVyhry + ' : ' + hosteVyhry + '</td>' +
                '<td class="p-3 match-tym-cell clickable" onclick="event.stopPropagation(); Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(utk.tymHoste) + '\')">' + Statistics.escapeHtml(utk.tymHoste) + '</td>' +
                '<td class="p-3 text-right"><span id="toggle-' + idx + '" class="match-toggle">▶</span></td>' +
                '</tr>' +
                '<tr id="detail-' + idx + '" style="display: none;"><td colspan="6" class="p-0">' +
                '<table class="w-full">' +
                '<thead><tr class="match-detail-head"><th class="text-left p-2 pl-8">Disciplína</th><th class="text-left p-2">Domácí</th><th class="text-left p-2">Hosté</th><th class="text-center p-2">Výsl.</th><th class="text-left p-2">Skóre</th></tr></thead>' +
                '<tbody>' + detailZapasy + '</tbody>' +
                '</table></td></tr>' +
                '</tbody>';
        }).join('');
        
        document.getElementById('zapasyObsah').innerHTML =
            '<div class="overflow-x-auto">' +
            '<table class="w-full text-sm">' +
            '<thead><tr class="standings-thead">' +
            '<th class="text-left p-3 font-semibold">Kolo</th>' +
            '<th class="text-left p-3 font-semibold">Datum</th>' +
            '<th class="text-left p-3 font-semibold">Domácí</th>' +
            '<th class="text-center p-3 font-semibold">Výsledek</th>' +
            '<th class="text-left p-3 font-semibold">Hosté</th>' +
            '<th class="text-right p-3 font-semibold"></th>' +
            '</tr></thead>' +
            utkaniHtml +
            '</table>' +
            '</div>';
    },
    
    toggleDetail(id) {
        const detail = document.getElementById(id);
        const toggle = document.getElementById(id.replace('detail-', 'toggle-'));
        if (detail.style.display === 'none') {
            detail.style.display = 'table-row';
            toggle.textContent = '▼';
        } else {
            detail.style.display = 'none';
            toggle.textContent = '▶';
        }
    }
};