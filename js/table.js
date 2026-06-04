const Table = {
    render(aktualni_soutez) {
        const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
        const tymy = Statistics.seraditTymyPodleTabulky(tabulkaData);
        const zmenyPozic = Statistics.vypocitejZmenyPozic(aktualni_soutez);

        const jePrvniLiga = aktualni_soutez.includes('prvni-liga');

        const rows = tymy.map((tym, idx) => {
            const t = tabulkaData[tym];
            const rozdilZapasy = t.zapasyV - t.zapasyP;
            const rozdilSety = t.setyV - t.setyP;
            const rozdilBody = t.bodyV - t.bodyP;

            // Zone classification
            let zoneClass = '';
            let zoneBar = '';
            if (jePrvniLiga) {
                if (idx <= 3) { zoneClass = 'standings-row-playoff'; zoneBar = '<span class="zone-bar zone-bar-playoff"></span>'; }
                else if (idx === 8) { zoneClass = 'standings-row-relegation'; zoneBar = '<span class="zone-bar zone-bar-relegation"></span>'; }
            } else {
                if (idx <= 1) { zoneClass = 'standings-row-top'; zoneBar = '<span class="zone-bar zone-bar-top"></span>'; }
                else if (idx >= 2 && idx <= 5) { zoneClass = 'standings-row-playoff'; zoneBar = '<span class="zone-bar zone-bar-playoff"></span>'; }
                else if (idx === 7) { zoneClass = 'standings-row-relegation'; zoneBar = '<span class="zone-bar zone-bar-relegation"></span>'; }
            }

            // Position change indicator
            const zmena = zmenyPozic[tym] || 0;
            let zmenaHtml = '<span class="forma-neutral">—</span>';
            if (zmena > 0) zmenaHtml = '<span class="forma-up">↑' + zmena + '</span>';
            else if (zmena < 0) zmenaHtml = '<span class="forma-down">↓' + Math.abs(zmena) + '</span>';

            const sipkaZapasy = rozdilZapasy > 0 ? '↗' : (rozdilZapasy < 0 ? '↘' : '→');
            const sipkaSety = rozdilSety > 0 ? '↗' : (rozdilSety < 0 ? '↘' : '→');
            const sipkaBody = rozdilBody > 0 ? '↗' : (rozdilBody < 0 ? '↘' : '→');

            return '<tr class="standings-row ' + zoneClass + '">' +
                '<td class="standings-pos-cell">' + zoneBar + '<span class="standings-pos-num">' + (idx + 1) + '.</span></td>' +
                '<td class="standings-name-cell clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(tym) + '\')">' + Statistics.escapeHtml(tym) + '</td>' +
                '<td class="standings-forma-cell">' + zmenaHtml + '</td>' +
                '<td class="standings-num-cell">' + t.utkani + '</td>' +
                '<td class="standings-num-cell text-win">' + t.vyhry + '</td>' +
                '<td class="standings-num-cell text-draw">' + t.remizy + '</td>' +
                '<td class="standings-num-cell text-loss">' + t.prohry + '</td>' +
                '<td class="standings-ratio-cell"><span class="ratio-val">' + t.zapasyV + ':' + t.zapasyP + '</span> <span class="ratio-diff ' + (rozdilZapasy >= 0 ? 'pos' : 'neg') + '">' + sipkaZapasy + (rozdilZapasy >= 0 ? '+' : '') + rozdilZapasy + '</span></td>' +
                '<td class="standings-ratio-cell"><span class="ratio-val">' + t.setyV + ':' + t.setyP + '</span> <span class="ratio-diff ' + (rozdilSety >= 0 ? 'pos' : 'neg') + '">' + sipkaSety + (rozdilSety >= 0 ? '+' : '') + rozdilSety + '</span></td>' +
                '<td class="standings-ratio-cell"><span class="ratio-val">' + t.bodyV + ':' + t.bodyP + '</span> <span class="ratio-diff ' + (rozdilBody >= 0 ? 'pos' : 'neg') + '">' + sipkaBody + (rozdilBody >= 0 ? '+' : '') + rozdilBody + '</span></td>' +
                '<td class="standings-pts-cell">' + t.body + '</td>' +
            '</tr>';
        }).join('');

        const legendaInfo = jePrvniLiga
            ? '<div class="standings-legenda"><span class="legenda-item"><span class="legenda-dot legenda-playoff"></span> 1.–4. Play-off</span><span class="legenda-item"><span class="legenda-dot legenda-relegation"></span> 9. Kvalifikace o 1. ligu</span></div>'
            : '<div class="standings-legenda"><span class="legenda-item"><span class="legenda-dot legenda-top"></span> 1.–2. Přímý postup do Final Four</span><span class="legenda-item"><span class="legenda-dot legenda-playoff"></span> 3.–6. Čtvrtfinále</span><span class="legenda-item"><span class="legenda-dot legenda-relegation"></span> 8. Baráž</span></div>';

        const bodovaniInfo = jePrvniLiga
            ? '<p class="font-semibold mb-2">Bodování 1. ligy:</p><ul class="list-disc list-inside space-y-1 text-xs md:text-sm"><li>Výhra (8:0–5:3) = 3 body</li><li>Remíza (4:4) = 2 body pro oba</li><li>Prohra (3:5–0:8) = 1 bod</li></ul>'
            : '<p class="font-semibold mb-2">Bodování extraligy:</p><ul class="list-disc list-inside space-y-1 text-xs md:text-sm"><li>Výhra 7:0, 6:1 = 3 body</li><li>Výhra 5:2, 4:3 = 2 body</li><li>Prohra 3:4, 2:5 = 1 bod</li><li>Prohra 1:6, 0:7 = 0 bodů</li></ul>';

        document.getElementById('tabulkaObsah').innerHTML =
            '<div class="overflow-x-auto">' +
            '<table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th>' +
            '<th class="th-name">Tým</th>' +
            '<th class="th-forma" title="Změna pozice oproti předchozímu kolu">±</th>' +
            '<th class="th-num">U</th>' +
            '<th class="th-num">V</th>' +
            '<th class="th-num">R</th>' +
            '<th class="th-num">P</th>' +
            '<th class="th-ratio">Zápasy</th>' +
            '<th class="th-ratio">Sety</th>' +
            '<th class="th-ratio">Body</th>' +
            '<th class="th-pts">Pts</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table></div>' +
            '<div class="mt-4 text-xs md:text-sm text-gray-600">' + legendaInfo +
            '<div class="mt-3">' + bodovaniInfo + '</div></div>';
    }
};
