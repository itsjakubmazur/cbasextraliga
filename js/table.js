const Table = {
    render(aktualni_soutez) {
        const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
        const tymy = Statistics.seraditTymyPodleTabulky(tabulkaData);
        const jePrvniLiga = aktualni_soutez.includes('prvni-liga');

        const getZone = (idx) => {
            if (jePrvniLiga) {
                if (idx <= 3) return 'playoff';
                if (idx === tymy.length - 1) return 'relegation';
                return '';
            } else {
                if (idx <= 1) return 'final-four';
                if (idx <= 5) return 'playoff';
                if (idx === 7) return 'relegation';
                return '';
            }
        };

        const posClass = (idx) => ['pos-gold', 'pos-silver', 'pos-bronze'][idx] || '';

        const rows = [];
        tymy.forEach((tym, idx) => {
            const t = tabulkaData[tym];
            const zone = getZone(idx);
            const pc = posClass(idx);

            const forma = Statistics.vypocitejFormuTymu(tym, aktualni_soutez);
            const formaDots = forma.map(r => '<span class="form-dot form-dot-' + r + '"></span>').join('');

            rows.push(
                '<tr class="standings-row" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(tym) + '\')">' +
                '<td class="standings-pos-cell"><span class="standings-pos-num ' + pc + '">' + (idx + 1) + '</span></td>' +
                '<td class="standings-name-cell">' +
                '<span class="zone-dot zone-dot-' + (zone || 'none') + '"></span>' +
                Statistics.escapeHtml(tym) + '</td>' +
                '<td class="standings-num-cell text-win">' + t.vyhry + '</td>' +
                '<td class="standings-num-cell text-loss">' + t.prohry + '</td>' +
                '<td class="standings-forma-cell"><span class="form-dots">' + formaDots + '</span></td>' +
                '<td class="standings-pts-cell">' + t.body + '</td>' +
                '</tr>'
            );

            // Zone dividers (inserted after current row)
            if (!jePrvniLiga && idx === 1) {
                rows.push('<tr class="standings-divider standings-divider-playoff"><td colspan="6"><span>&#x2193; Čtvrtfinále</span></td></tr>');
            } else if (!jePrvniLiga && idx === 5) {
                rows.push('<tr class="standings-divider standings-divider-relegation"><td colspan="6"><span>&#x2193; Baráž</span></td></tr>');
            } else if (jePrvniLiga && idx === 3) {
                rows.push('<tr class="standings-divider standings-divider-mid"><td colspan="6"></td></tr>');
            } else if (jePrvniLiga && tymy.length > 5 && idx === tymy.length - 2) {
                rows.push('<tr class="standings-divider standings-divider-relegation"><td colspan="6"><span>&#x2193; Kvalifikace</span></td></tr>');
            }
        });

        const legendaInfo = jePrvniLiga
            ? '<span class="legenda-item"><span class="legenda-dot legenda-playoff"></span> 1.–4. Play-off</span>' +
              '<span class="legenda-item"><span class="legenda-dot legenda-relegation"></span> Posl. Kvalifikace o 1. ligu</span>'
            : '<span class="legenda-item"><span class="legenda-dot legenda-final-four"></span> 1.–2. Přímý postup do Final Four</span>' +
              '<span class="legenda-item"><span class="legenda-dot legenda-playoff"></span> 3.–6. Čtvrtfinále</span>' +
              '<span class="legenda-item"><span class="legenda-dot legenda-relegation"></span> 8. Baráž</span>';

        const bodovaniInfo = jePrvniLiga
            ? '<strong>Bodování:</strong> Výhra (8:0–5:3) = 3b · Remíza (4:4) = 2b · Prohra (3:5–0:8) = 1b'
            : '<strong>Bodování:</strong> Výhra 7:0, 6:1 = 3b · Výhra 5:2, 4:3 = 2b · Prohra 3:4, 2:5 = 1b · Prohra 1:6, 0:7 = 0b';

        document.getElementById('tabulkaObsah').innerHTML =
            '<div class="overflow-x-auto">' +
            '<table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th>' +
            '<th class="th-name">Tým</th>' +
            '<th class="th-num" title="Vítězství">V</th>' +
            '<th class="th-num" title="Porážky">P</th>' +
            '<th class="th-forma" title="Posledních 5 zápasů">Forma</th>' +
            '<th class="th-pts">Body</th>' +
            '</tr></thead>' +
            '<tbody>' + rows.join('') + '</tbody>' +
            '</table></div>' +
            '<div class="table-footer">' +
            '<div class="standings-legenda">' + legendaInfo + '</div>' +
            '<div class="table-bodovani">' + bodovaniInfo + '</div>' +
            '</div>';
    }
};
