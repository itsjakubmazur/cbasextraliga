const Players = {
    renderTop3(aktualni_soutez, vybrana_kola) {
        const vsechnaKola = [...new Set(Data.zapasy[aktualni_soutez].map(z => z.kolo))].sort((a, b) => parseInt(b) - parseInt(a));

        const kolaCheckboxy = vsechnaKola.map(kolo => {
            const isActive = vybrana_kola.size === 0 || vybrana_kola.has(kolo);
            return '<label class="kolo-tag' + (isActive ? ' kolo-tag-active' : '') + '">' +
                '<input type="checkbox" value="' + kolo + '" onchange="Players.toggleKoloTop3(\'' + kolo + '\')" ' +
                (isActive ? 'checked' : '') + ' style="display:none">' +
                '<span>' + kolo + '</span>' +
                '</label>';
        }).join('');

        const kolaLabel = vybrana_kola.size === 0 ? 'Všechna kola' : vybrana_kola.size + '/' + vsechnaKola.length + ' kol';
        const filterHtml = '<div class="players-filter-row">' +
            '<button onclick="Players.toggleTop3Filtr()" class="filter-pill">Kola: ' + kolaLabel + '</button>' +
            '<button onclick="Players.poslednichXKolTop3(2)" class="filter-pill">Poslední 2</button>' +
            '<button onclick="Players.vyberVsechnaKolaTop3()" class="filter-pill">Vše</button>' +
            '</div>' +
            '<div id="top3KolaPanel" class="kola-panel" style="display:none;">' +
            '<div class="kola-panel-inner">' + kolaCheckboxy + '</div>' +
            '</div>';

        const stats = Statistics.vypocitejStatistiky(aktualni_soutez, vybrana_kola);
        const hraciList = Object.keys(stats).filter(h => stats[h].zapasy >= 1);
        Statistics.seraditHraceStandardne(hraciList, stats);
        const top3 = hraciList.slice(0, 3);

        if (top3.length === 0) {
            document.getElementById('hracMesiceContainer').innerHTML =
                '<div class="app-card-header"><h2 class="app-card-title">' + Icons.flame() + ' TOP 3 Hráči</h2></div>' +
                '<div style="padding: 12px 16px;">' + filterHtml + '<p style="color:var(--text2);font-size:0.8rem;">Žádní hráči pro vybraná kola</p></div>';
            return;
        }

        const rankLabels = ['1. místo', '2. místo', '3. místo'];
        const statColors = ['player-stat-gold', 'player-stat-silver', 'player-stat-bronze'];
        const rankBadgeColors = ['rank-gold', 'rank-silver', 'rank-bronze'];

        const html = top3.map((hrac, idx) => {
            const s = stats[hrac];
            const winRate = ((s.vyhry / s.zapasy) * 100).toFixed(1);
            const tymNazev = Object.keys(s.tymy).sort((a, b) => s.tymy[b] - s.tymy[a])[0] || '';
            return '<div class="player-card" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(hrac) + '\')">' +
                '<div class="player-rank ' + rankBadgeColors[idx] + '">' + rankLabels[idx] + '</div>' +
                '<div class="player-name">' + Statistics.escapeHtml(hrac) + '</div>' +
                '<div class="player-team">' + Statistics.escapeHtml(tymNazev) + '</div>' +
                '<div class="player-stat ' + statColors[idx] + '">' + winRate + '%</div>' +
                '<div class="player-stat-label">' + s.vyhry + 'V / ' + s.prohry + 'P · ' + s.zapasy + ' zápasů</div>' +
                '</div>';
        }).join('');

        document.getElementById('hracMesiceContainer').innerHTML =
            '<div class="app-card-header"><h2 class="app-card-title">' + Icons.flame() + ' TOP 3 Hráči</h2></div>' +
            '<div style="padding: 10px 16px 4px;">' + filterHtml + '</div>' +
            '<div class="players-grid">' + html + '</div>';
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
                const sA = stats[a], sB = stats[b];
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
            const isGood = parseFloat(winRatio) >= 50;

            const forma = Statistics.getForma(hrac, Statistics.getZapasyProSoutez(aktualni_soutez));
            const formaHtml = forma.split('').map(v =>
                '<span class="form-dot form-dot-' + (v === 'V' ? 'w' : 'l') + '"></span>'
            ).join('');

            return '<tr class="stats-row">' +
                '<td class="stats-cell stats-pos">' + (idx + 1) + '</td>' +
                '<td class="stats-cell stats-name clickable" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(hrac) + '\')">' + Statistics.escapeHtml(hrac) + '</td>' +
                '<td class="stats-cell stats-team clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(nejTym) + '\')">' + Statistics.escapeHtml(nejTym) + '</td>' +
                '<td class="stats-cell stats-num">' + s.zapasy + '</td>' +
                '<td class="stats-cell stats-num stats-win">' + s.vyhry + '</td>' +
                '<td class="stats-cell stats-num stats-loss">' + s.prohry + '</td>' +
                '<td class="stats-cell stats-num ' + (isGood ? 'stats-winrate-good' : 'stats-winrate-bad') + '">' + winRatio + '%</td>' +
                '<td class="stats-cell"><span class="form-dots">' + (formaHtml || '–') + '</span></td>' +
                '</tr>';
        }).join('');

        const tymyOptions = Data.tymy[aktualni_soutez].map(t =>
            '<option value="' + t + '"' + (t === filtrTymHodnota ? ' selected' : '') + '>' + t + '</option>'
        ).join('');

        const filtryHtml = '<div class="stats-filters">' +
            '<div class="stats-filter-label">' + Icons.search() + ' Filtry</div>' +
            '<div class="stats-filter-grid">' +
            '<div class="stats-filter-group"><label class="stats-filter-sublabel">Hráč</label>' +
            '<input type="text" id="hledatHrace" placeholder="Jméno..." value="' + hledatHodnota.replace(/"/g, '&quot;') + '" class="stats-filter-input" oninput="Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola)"></div>' +
            '<div class="stats-filter-group"><label class="stats-filter-sublabel">Tým</label>' +
            '<select id="filtrTym" class="stats-filter-input" onchange="App.zobrazitData()">' +
            '<option value="">Všechny týmy</option>' + tymyOptions + '</select></div>' +
            '<div class="stats-filter-group"><label class="stats-filter-sublabel">Disciplína</label>' +
            '<select id="filtrDisciplina" class="stats-filter-input" onchange="App.zobrazitData()">' +
            '<option value="">Vše</option>' +
            '<option value="dvouhra"' + (filtrDisciplinaHodnota === 'dvouhra' ? ' selected' : '') + '>Dvouhry</option>' +
            '<option value="ctyrhra"' + (filtrDisciplinaHodnota === 'ctyrhra' ? ' selected' : '') + '>Čtyřhry</option>' +
            '</select></div>' +
            '<div class="stats-filter-group"><label class="stats-filter-sublabel">Min. zápasů</label>' +
            '<input type="number" id="minZapasy" value="' + minZapasyHodnota + '" min="0" class="stats-filter-input" oninput="Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola)"></div>' +
            '<div class="stats-filter-group"><label class="stats-filter-sublabel">Řadit dle</label>' +
            '<select id="razeniSloupec" class="stats-filter-input" onchange="Players.renderStatistiky(App.aktualni_soutez, App.vybrana_kola)">' +
            '<option value="winrate"' + (razeniSloupec === 'winrate' ? ' selected' : '') + '>Win %</option>' +
            '<option value="zapasy"' + (razeniSloupec === 'zapasy' ? ' selected' : '') + '>Zápasy</option>' +
            '<option value="vyhry"' + (razeniSloupec === 'vyhry' ? ' selected' : '') + '>Výhry</option>' +
            '<option value="jmeno"' + (razeniSloupec === 'jmeno' ? ' selected' : '') + '>Jméno</option>' +
            '</select></div>' +
            '<div class="stats-filter-group stats-filter-reset"><button onclick="Filters.vymazat()" class="filter-pill filter-pill-clear">' + Icons.x() + ' Reset</button></div>' +
            '</div>' +
            '<div class="stats-filter-kola">' +
            '<div class="stats-filter-kola-header">' +
            '<span class="stats-filter-sublabel">Kola</span>' +
            '<div class="stats-filter-kola-actions">' +
            '<button onclick="Filters.vyberVsechna()" class="stats-kola-btn">Vše</button>' +
            '<button onclick="Filters.zrusVsechna()" class="stats-kola-btn stats-kola-btn-clear">Žádné</button>' +
            '</div></div>' +
            '<div id="kolaCheckboxy" class="kola-panel-inner"></div>' +
            '</div></div>';

        document.getElementById('statistikyObsah').innerHTML = filtryHtml +
            '<div class="overflow-x-auto"><table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th>' +
            '<th class="th-name">Hráč</th>' +
            '<th class="th-name">Tým</th>' +
            '<th class="th-num" title="Zápasy">Z</th>' +
            '<th class="th-num" title="Výhry">V</th>' +
            '<th class="th-num" title="Porážky">P</th>' +
            '<th class="th-num">Win%</th>' +
            '<th class="th-forma">Forma</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';

        Filters.renderKolaCheckboxy(aktualni_soutez, vybrana_kola);

        if (bylFokus) {
            const el = document.getElementById('hledatHrace');
            if (el) { el.focus(); el.setSelectionRange(kurzorPozice, kurzorPozice); }
        }
    },

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

        if (hraciList.length === 0) return '<p style="color:var(--text2);font-size:0.85rem;padding:8px 0;">Žádná data.</p>';

        const rows = hraciList.map((hrac, idx) => {
            const s = stats[hrac];
            const winRatio = s.zapasy > 0 ? ((s.vyhry / s.zapasy) * 100).toFixed(1) : '0.0';
            const nejTym = Object.keys(s.tymy).length > 0 ? Object.entries(s.tymy).sort((a, b) => b[1] - a[1])[0][0] : '-';
            const isGood = parseFloat(winRatio) >= 50;
            return '<tr class="stats-row">' +
                '<td class="stats-cell stats-pos">' + (idx + 1) + '</td>' +
                '<td class="stats-cell stats-name">' + Statistics.escapeHtml(hrac) + '</td>' +
                '<td class="stats-cell stats-team">' + Statistics.escapeHtml(nejTym) + '</td>' +
                '<td class="stats-cell stats-num">' + s.zapasy + '</td>' +
                '<td class="stats-cell stats-num stats-win">' + s.vyhry + '</td>' +
                '<td class="stats-cell stats-num stats-loss">' + s.prohry + '</td>' +
                '<td class="stats-cell stats-num ' + (isGood ? 'stats-winrate-good' : 'stats-winrate-bad') + '">' + winRatio + '%</td>' +
                '</tr>';
        }).join('');

        return '<div class="overflow-x-auto"><table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th>' +
            '<th class="th-name">Hráč</th>' +
            '<th class="th-name">Tým</th>' +
            '<th class="th-num">Z</th>' +
            '<th class="th-num">V</th>' +
            '<th class="th-num">P</th>' +
            '<th class="th-num">Win%</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
};
