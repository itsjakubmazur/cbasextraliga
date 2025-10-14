const Matches = {
    render(aktualni_soutez) {
        document.getElementById('pocetZapasu').textContent = Data.zapasy[aktualni_soutez].length;
        
        // Seskupit zápasy podle utkání (kolo + týmy)
        const utkani = {};
        Data.zapasy[aktualni_soutez].forEach(zapas => {
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
                if (v.domaci > v.hoste) domaciVyhry++;
                else hosteVyhry++;
            });
            
            const domaciVyhral = domaciVyhry > hosteVyhry;
            const vysledekClass = domaciVyhral ? 'text-blue-600' : 'text-purple-600';
            
            // Detail zápasů (defaultně skrytý)
            const detailZapasy = utk.zapasy.map(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                const vyhralDomaci = v.domaci > v.hoste;
                return '<tr class="text-xs ' + (vyhralDomaci ? 'bg-blue-50' : 'bg-purple-50') + '">' +
                    '<td class="p-2 pl-8">' + z.disciplina + '</td>' +
                    '<td class="p-2">' + z.domaci + '</td>' +
                    '<td class="p-2">' + z.hoste + '</td>' +
                    '<td class="p-2 text-center font-bold">' + z.vysledek + '</td>' +
                    '<td class="p-2 text-xs text-gray-600">' + (z.sety || '-') + '</td>' +
                    '</tr>';
            }).join('');
            
            return '<tbody>' +
                '<tr class="bg-gray-100 hover:bg-gray-200 cursor-pointer border-t-2 border-gray-300" onclick="Matches.toggleDetail(\'detail-' + idx + '\')">' +
                '<td class="p-3 font-bold">Kolo ' + utk.kolo + '</td>' +
                '<td class="p-3">' + (utk.datum || '-') + '</td>' +
                '<td class="p-3 font-semibold text-blue-600 clickable" onclick="event.stopPropagation(); Modals.zobrazitDetailTymu(\'' + utk.tymDomaci + '\')">' + utk.tymDomaci + '</td>' +
                '<td class="p-3 text-center text-2xl font-bold ' + vysledekClass + '">' + domaciVyhry + ' : ' + hosteVyhry + '</td>' +
                '<td class="p-3 font-semibold text-purple-600 clickable" onclick="event.stopPropagation(); Modals.zobrazitDetailTymu(\'' + utk.tymHoste + '\')">' + utk.tymHoste + '</td>' +
                '<td class="p-3 text-right"><span id="toggle-' + idx + '" class="text-xl">▶</span></td>' +
                '</tr>' +
                '<tr id="detail-' + idx + '" style="display: none;"><td colspan="6" class="p-0">' +
                '<table class="w-full">' +
                '<thead><tr class="bg-gray-50 text-xs"><th class="text-left p-2 pl-8">Disciplína</th><th class="text-left p-2">Domácí</th><th class="text-left p-2">Hosté</th><th class="text-center p-2">Výsl.</th><th class="text-left p-2">Skóre</th></tr></thead>' +
                '<tbody>' + detailZapasy + '</tbody>' +
                '</table></td></tr>' +
                '</tbody>';
        }).join('');
        
        document.getElementById('zapasyObsah').innerHTML = 
            '<div class="overflow-x-auto">' +
            '<table class="w-full text-sm">' +
            '<thead><tr class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">' +
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