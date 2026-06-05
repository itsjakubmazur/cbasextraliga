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

        // Number of columns depends on whether draws are possible (1. liga)
        const colspan = jePrvniLiga ? 11 : 10;

        const rows = [];
        tymy.forEach((tym, idx) => {
            const t = tabulkaData[tym];
            const zone = getZone(idx);
            const pc = posClass(idx);

            const forma = Statistics.vypocitejFormuTymu(tym, aktualni_soutez);
            const formaDots = forma.map(r => '<span class="form-dot form-dot-' + r + '"></span>').join('');

            const remizaCol = jePrvniLiga
                ? '<td class="standings-num-cell">' + t.remizy + '</td>'
                : '';

            rows.push(
                '<tr class="standings-row" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(tym) + '\')">' +
                '<td class="standings-pos-cell"><span class="standings-pos-num ' + pc + '">' + (idx + 1) + '</span></td>' +
                '<td class="standings-name-cell">' +
                '<span class="zone-dot zone-dot-' + (zone || 'none') + '"></span>' +
                '<span class="team-name-full">' + Statistics.escapeHtml(tym) + '</span>' +
                '<span class="team-name-short">' + Statistics.escapeHtml(Statistics.zkracenyNazev(tym)) + '</span>' +
                '</td>' +
                '<td class="standings-num-cell text-win">' + t.vyhry + '</td>' +
                remizaCol +
                '<td class="standings-num-cell text-loss">' + t.prohry + '</td>' +
                '<td class="standings-ratio-cell">' + t.zapasyV + ':' + t.zapasyP + '</td>' +
                '<td class="standings-ratio-cell standings-col-sety">' + t.setyV + ':' + t.setyP + '</td>' +
                '<td class="standings-ratio-cell standings-col-mice">' + t.bodyV + ':' + t.bodyP + '</td>' +
                '<td class="standings-forma-cell"><span class="form-dots">' + formaDots + '</span></td>' +
                '<td class="standings-pts-cell">' + t.body + '</td>' +
                '</tr>'
            );

            // Zone dividers (inserted after current row)
            if (!jePrvniLiga && idx === 1) {
                rows.push('<tr class="standings-divider standings-divider-playoff"><td colspan="' + colspan + '"><span>↓ Čtvrtfinále</span></td></tr>');
            } else if (!jePrvniLiga && idx === 6) {
                rows.push('<tr class="standings-divider standings-divider-relegation"><td colspan="' + colspan + '"><span>↓ Baráž</span></td></tr>');
            } else if (jePrvniLiga && idx === 3) {
                rows.push('<tr class="standings-divider standings-divider-mid"><td colspan="' + colspan + '"></td></tr>');
            } else if (jePrvniLiga && tymy.length > 5 && idx === tymy.length - 2) {
                rows.push('<tr class="standings-divider standings-divider-relegation"><td colspan="' + colspan + '"><span>↓ Kvalifikace</span></td></tr>');
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

        const remizaTh = jePrvniLiga ? '<th class="th-num" title="Remízy">R</th>' : '';

        document.getElementById('tabulkaObsah').innerHTML =
            '<div class="overflow-x-auto">' +
            '<table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th>' +
            '<th class="th-name">Tým</th>' +
            '<th class="th-num" title="Vítězství">V</th>' +
            remizaTh +
            '<th class="th-num" title="Porážky">P</th>' +
            '<th class="th-ratio" title="Poměr dílčích zápasů">Záp.</th>' +
            '<th class="th-ratio standings-col-sety" title="Poměr setů">Sety</th>' +
            '<th class="th-ratio standings-col-mice" title="Poměr míčů">Míče</th>' +
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
