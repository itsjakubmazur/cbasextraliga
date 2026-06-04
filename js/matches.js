const Matches = {
    render(aktualni_soutez) {
        let zapasyKZobrazeni = [...Data.zapasy[aktualni_soutez]];
        const jePrvniLiga = aktualni_soutez.includes('prvni-liga') && aktualni_soutez !== 'prvni-liga-playoff';
        if (jePrvniLiga && Data.zapasy['prvni-liga-playoff']?.length > 0) {
            zapasyKZobrazeni = zapasyKZobrazeni.concat(Data.zapasy['prvni-liga-playoff']);
        }

        document.getElementById('pocetZapasu').textContent = zapasyKZobrazeni.filter(z => !Statistics.isNeodehrano(z)).length;

        // Group into utkani (match = kolo + home + away)
        const utkaniMap = {};
        zapasyKZobrazeni.forEach(zapas => {
            const klic = zapas.kolo + '§' + zapas.tymDomaci + '§' + zapas.tymHoste;
            if (!utkaniMap[klic]) {
                utkaniMap[klic] = { kolo: zapas.kolo, datum: zapas.datum, tymDomaci: zapas.tymDomaci, tymHoste: zapas.tymHoste, zapasy: [] };
            }
            utkaniMap[klic].zapasy.push(zapas);
        });

        // Group utkani by kolo
        const kolaMap = {};
        Object.values(utkaniMap).forEach(u => {
            if (!kolaMap[u.kolo]) kolaMap[u.kolo] = [];
            kolaMap[u.kolo].push(u);
        });

        const sortedKola = Object.keys(kolaMap).sort((a, b) => {
            const aNum = parseInt(a), bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            const order = { 'RR': 0, 'QF': 1, 'SF': 2, '3M': 3, 'P3': 3, 'F': 4, 'P5': 5 };
            const aN = order[(a||'').toUpperCase()] ?? 99, bN = order[(b||'').toUpperCase()] ?? 99;
            return aN - bN;
        });

        let globalIdx = 0;
        const kolaHtml = sortedKola.map((kolo, ki) => {
            const utk = kolaMap[kolo];
            const jePlayoff = Statistics.isPlayoffKolo(kolo);
            const koloLabel = jePlayoff ? Statistics.playoffKoloNazev(kolo) : 'Kolo ' + kolo;
            const odehrano = utk.filter(u => u.zapasy.some(z => !Statistics.isNeodehrano(z))).length;
            const summary = odehrano + ' / ' + utk.length + ' utkání';

            const utkaniRows = utk.map(u => {
                const uIdx = globalIdx++;
                let dV = 0, hV = 0;
                u.zapasy.forEach(z => {
                    const v = Statistics.parseVysledek(z.vysledek);
                    if (v.domaci === 0 && v.hoste === 0) return;
                    if (v.domaci > v.hoste) dV++; else hV++;
                });
                const vysledekClass = dV > hV ? 'match-score-home' : 'match-score-away';
                const rowCls = jePlayoff ? 'match-row match-row-playoff' : 'match-row';

                const detailRows = u.zapasy.map(z => {
                    const v = Statistics.parseVysledek(z.vysledek);
                    const neodehrano = Statistics.isNeodehrano(z);
                    const skrec = Statistics.isSkrec(z);
                    const vyhralDom = v.domaci > v.hoste;
                    const rc = neodehrano ? 'match-detail-pending' : (skrec ? 'match-detail-screc' : (vyhralDom ? 'match-detail-home' : 'match-detail-away'));
                    const skrecBadge = skrec ? ' <span class="match-skrec-badge">SKREČ</span>' : '';
                    return '<tr class="' + rc + '">' +
                        '<td class="match-detail-cell match-detail-disc">' + Statistics.escapeHtml(z.disciplina || '') + '</td>' +
                        '<td class="match-detail-cell">' + Statistics.escapeHtml(z.domaci || '') + skrecBadge + '</td>' +
                        '<td class="match-detail-cell">' + Statistics.escapeHtml(z.hoste || '') + '</td>' +
                        '<td class="match-detail-cell match-detail-score">' + (neodehrano ? '–' : (z.vysledek || '')) + '</td>' +
                        '<td class="match-detail-cell match-detail-sets">' + (z.sety || '–') + '</td>' +
                        '</tr>';
                }).join('');

                return '<tr class="' + rowCls + ' cursor-pointer" onclick="Matches.toggleDetail(\'utk-' + uIdx + '\')">' +
                    '<td class="p-2 match-datum-cell">' + (u.datum || '–') + '</td>' +
                    '<td class="p-2 match-tym-cell clickable" onclick="event.stopPropagation();Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(u.tymDomaci) + '\')">' + Statistics.escapeHtml(u.tymDomaci) + '</td>' +
                    '<td class="p-2 text-center match-score ' + vysledekClass + '">' + dV + ' : ' + hV + '</td>' +
                    '<td class="p-2 match-tym-cell clickable" onclick="event.stopPropagation();Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(u.tymHoste) + '\')">' + Statistics.escapeHtml(u.tymHoste) + '</td>' +
                    '<td class="p-2 text-right"><span id="mtoggle-' + uIdx + '" class="match-toggle">' + Icons.chevronRight() + '</span></td>' +
                    '</tr>' +
                    '<tr id="utk-' + uIdx + '" style="display:none"><td colspan="5" class="p-0">' +
                    '<table class="w-full"><thead><tr class="match-detail-head">' +
                    '<th class="match-detail-cell match-detail-disc">Disciplína</th>' +
                    '<th class="match-detail-cell">Domácí</th><th class="match-detail-cell">Hosté</th>' +
                    '<th class="match-detail-cell match-detail-score">Výsl.</th>' +
                    '<th class="match-detail-cell match-detail-sets">Skóre</th>' +
                    '</tr></thead><tbody>' + detailRows + '</tbody></table></td></tr>';
            }).join('');

            // All rounds collapsed by default; most recent numeric round is open
            const isLast = ki === sortedKola.length - 1;
            const bodyDisplay = isLast ? 'block' : 'none';
            const headerOpen = isLast ? ' open' : '';

            return '<div class="match-round-section">' +
                '<div class="match-round-header' + headerOpen + '" onclick="Matches.toggleRound(this,\'mround-' + ki + '\')">' +
                '<span class="match-round-label' + (jePlayoff ? ' match-round-playoff' : '') + '">' + koloLabel + '</span>' +
                '<span class="match-round-count">' + summary + '</span>' +
                '<span class="match-round-arrow">' + Icons.chevronDown() + '</span>' +
                '</div>' +
                '<div id="mround-' + ki + '" class="match-round-body" style="display:' + bodyDisplay + '">' +
                '<table class="w-full text-sm"><thead><tr class="match-subhead">' +
                '<th class="text-left p-2">Datum</th><th class="text-left p-2">Domácí</th>' +
                '<th class="text-center p-2">Výsledek</th><th class="text-left p-2">Hosté</th>' +
                '<th></th></tr></thead>' +
                utkaniRows +
                '</table></div></div>';
        }).join('');

        document.getElementById('zapasyObsah').innerHTML = '<div class="matches-rounds">' + kolaHtml + '</div>';
    },

    toggleRound(header, bodyId) {
        const body = document.getElementById(bodyId);
        const isOpen = header.classList.contains('open');
        header.classList.toggle('open', !isOpen);
        body.style.display = isOpen ? 'none' : 'block';
    },

    toggleDetail(id) {
        const detail = document.getElementById(id);
        const uIdx = id.replace('utk-', '');
        const toggle = document.getElementById('mtoggle-' + uIdx);
        const isHidden = detail.style.display === 'none';
        detail.style.display = isHidden ? 'table-row' : 'none';
        if (toggle) toggle.innerHTML = isHidden ? Icons.chevronDown() : Icons.chevronRight();
    }
};
