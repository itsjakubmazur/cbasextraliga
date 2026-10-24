const Table = {
    // Cista funkce: pro dany pocet tymu vrati pole (0-based, delky tymyCount)
    // { typ, legenda, dividerAfter, dividerMinTeams } podle konfig.zony[soutez].
    // zonyConfig je serazeny seznam { doPozice, typ, legenda, dividerAfter, dividerMinTeams },
    // doPozice je 1-based pozice v tabulce (nebo 'last'/'last-1' relativne k poctu tymu);
    // prvni polozka s pozice <= doPozice vyhrava (stejny vzor jako bodovani.tiers).
    vypocitejZony(tymyCount, zonyConfig) {
        const resolvePozice = (doPozice) => {
            if (doPozice === 'last') return tymyCount;
            if (doPozice === 'last-1') return tymyCount - 1;
            return doPozice;
        };
        const resolved = (zonyConfig || []).map(z => ({ ...z, _pozice: resolvePozice(z.doPozice) }));
        const zony = [];
        for (let idx = 0; idx < tymyCount; idx++) {
            const pozice = idx + 1;
            const match = resolved.find(z => pozice <= z._pozice);
            if (!match) {
                zony.push({ typ: '', legenda: null, dividerAfter: null, dividerClass: null, dividerMinTeams: null });
                continue;
            }
            // dividerAfter/dividerClass plati jen na POSLEDNI pozici dane zony
            // (hranici k dalsi), ne na kazde pozici, co do teto zony spada.
            const jeHranice = pozice === match._pozice;
            zony.push({
                typ: match.typ,
                legenda: match.legenda,
                dividerAfter: jeHranice ? match.dividerAfter : null,
                dividerClass: jeHranice ? match.dividerClass : null,
                dividerMinTeams: jeHranice ? match.dividerMinTeams : null,
            });
        }
        return zony;
    },

    render(aktualni_soutez) {
        const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
        const tymy = Statistics.seraditTymyPodleTabulky(tabulkaData);
        const konfig = Data.getKonfigurace(App.aktualni_rocnik);
        const bodovani = (konfig.bodovani && konfig.bodovani[aktualni_soutez]) || Statistics._FALLBACK_BODOVANI.extraliga;
        const jePrvniLiga = bodovani.remizaMozna;
        const zony = this.vypocitejZony(tymy.length, (konfig.zony && konfig.zony[aktualni_soutez]) || []);

        const getZone = (idx) => zony[idx].typ;

        const posClass = (idx) => ['pos-gold', 'pos-silver', 'pos-bronze'][idx] || '';

        // Number of columns: base 11 (extraliga) or 12 (1. liga with R)
        const colspan = jePrvniLiga ? 12 : 11;

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
                (Data.tymLoga && Data.tymLoga[tym] ? '<img class="team-row-logo" src="' + Statistics.escapeAttr(Data.tymLoga[tym]) + '" alt="" onerror="this.remove()">' : '') +
                '<span class="team-name-full">' + Statistics.escapeHtml(tym) + '</span>' +
                '<span class="team-name-short">' + Statistics.escapeHtml(Statistics.zkracenyNazev(tym)) + '</span>' +
                '</td>' +
                '<td class="standings-num-cell">' + t.utkani + '</td>' +
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
            const z = zony[idx];
            if (z.dividerAfter !== null && z.dividerAfter !== undefined && (!z.dividerMinTeams || tymy.length > z.dividerMinTeams - 1)) {
                const label = z.dividerAfter ? '<span>' + z.dividerAfter + '</span>' : '';
                rows.push('<tr class="standings-divider' + (z.dividerClass ? ' ' + z.dividerClass : '') + '"><td colspan="' + colspan + '">' + label + '</td></tr>');
            }
        });

        const legendaInfo = ((konfig.zony && konfig.zony[aktualni_soutez]) || [])
            .filter(z => z.legenda)
            .map(z => '<span class="legenda-item"><span class="legenda-dot legenda-' + z.typ + '"></span> ' + z.legenda + '</span>')
            .join('');

        const bodovaniInfo = (konfig.bodovaniInfo && konfig.bodovaniInfo[aktualni_soutez]) || '';

        const remizaTh = jePrvniLiga ? '<th class="th-num" title="Remízy">R</th>' : '';

        document.getElementById('tabulkaObsah').innerHTML =
            '<div class="overflow-x-auto">' +
            '<table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th>' +
            '<th class="th-name">Tým</th>' +
            '<th class="th-num" title="Utkání">U</th>' +
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
