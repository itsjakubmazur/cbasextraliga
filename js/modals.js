const Modals = {
    toggleRound(header) {
        const body = header.nextElementSibling;
        const isOpen = header.classList.contains('open');
        header.classList.toggle('open', !isOpen);
        body.style.display = isOpen ? 'none' : 'block';
    },

    _sortKola(kola) {
        return kola.sort((a, b) => {
            const aNum = parseInt(a), bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            const order = { 'QF': 1, 'SF': 2, 'F': 3, 'P5': 4 };
            return (order[a] || 99) - (order[b] || 99);
        });
    },

    _koloLabel(kolo) {
        return Statistics.isPlayoffKolo(kolo) ? Statistics.playoffKoloNazev(kolo) : 'Kolo ' + kolo;
    },

    zobrazitDetailHrace(hrac) {
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
        const winRate = ((s.vyhry / s.zapasy) * 100).toFixed(1);
        const nejTym = Object.keys(s.tymy).length > 0 ? Object.entries(s.tymy).sort((a, b) => b[1] - a[1])[0][0] : '-';

        document.getElementById('modalHracJmeno').textContent = hrac;
        document.getElementById('modalHracInfo').textContent = nejTym + ' · ' + s.zapasy + ' zápasů · ' + winRate + '% úspěšnost';

        // Group matches by round
        const kolaMap = {};
        s.vsechnyZapasy.forEach(z => {
            if (!kolaMap[z.kolo]) kolaMap[z.kolo] = [];
            kolaMap[z.kolo].push(z);
        });

        const matchTableRows = this._sortKola(Object.keys(kolaMap)).flatMap(kolo => {
            const zapasy = kolaMap[kolo];
            const sepRow = '<tr class="stats-round-sep"><td colspan="4">' + this._koloLabel(kolo) + '</td></tr>';
            const rows = zapasy.map(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                const dh = Statistics.getHraciFromTeam(z.domaci);
                const hh = Statistics.getHraciFromTeam(z.hoste);
                const jeDom = dh.includes(hrac);
                const vyhral = jeDom ? (v.domaci > v.hoste) : (v.hoste > v.domaci);
                const partneri = jeDom ? dh.filter(h => h !== hrac) : hh.filter(h => h !== hrac);
                const souperi = (jeDom ? hh : dh).join(', ');
                const souperiTym = jeDom ? z.tymHoste : z.tymDomaci;
                const partnerStr = partneri.length > 0 ? '· s ' + partneri.join(', ') : '';
                return '<tr class="stats-row">' +
                    '<td class="stats-cell" style="white-space:nowrap;color:var(--text2);font-size:0.72rem">' + (z.disciplina || '–') + '</td>' +
                    '<td class="stats-cell">' +
                        '<div style="font-size:0.8rem;font-weight:600;color:var(--text)">' + Statistics.escapeHtml(souperi) + '</div>' +
                        '<div style="font-size:0.68rem;color:var(--text2);margin-top:1px">' +
                            '<span class="clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(souperiTym) + '\')">' + Statistics.escapeHtml(souperiTym) + '</span>' +
                            (partnerStr ? ' <span style="color:var(--muted)">' + Statistics.escapeHtml(partnerStr) + '</span>' : '') +
                        '</div>' +
                    '</td>' +
                    '<td class="stats-cell stats-num ' + (vyhral ? 'stats-win' : 'stats-loss') + '" style="font-weight:700">' + (vyhral ? 'V' : 'P') + '</td>' +
                    '<td class="stats-cell stats-num" style="font-size:0.72rem;color:var(--text2)">' + (z.vysledek || '–') + '</td>' +
                    '</tr>';
            });
            return [sepRow, ...rows];
        }).join('');

        // Forma
        const forma = Statistics.getForma(hrac, Statistics.getZapasyProSoutez(soutezProHrace));
        const formaHtml = forma.split('').map(v =>
            '<span class="form-dot form-dot-' + (v === 'V' ? 'w' : 'l') + ' form-dot-lg"></span>'
        ).join('');

        // Opponents
        const souperiCount = {};
        s.vsechnyZapasy.forEach(z => {
            const dh = Statistics.getHraciFromTeam(z.domaci);
            const hh = Statistics.getHraciFromTeam(z.hoste);
            const souperi = dh.includes(hrac) ? hh : dh;
            souperi.forEach(sp => souperiCount[sp] = (souperiCount[sp] || 0) + 1);
        });
        const nejSouperi = Object.entries(souperiCount)
            .sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([sp, poc]) =>
                '<span class="opponent-pill" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(sp) + '\')">' +
                Statistics.escapeHtml(sp) + ' <span style="color:var(--muted)">(' + poc + '×)</span></span>'
            ).join('');

        document.getElementById('modalHracObsah').innerHTML =
            '<div class="modal-stats-bar">' +
            '<div class="modal-stat-item"><div class="modal-stat-value">' + s.zapasy + '</div><div class="modal-stat-label">Zápasy</div></div>' +
            '<div class="modal-stat-item win"><div class="modal-stat-value">' + s.vyhry + '</div><div class="modal-stat-label">Výhry</div></div>' +
            '<div class="modal-stat-item loss"><div class="modal-stat-value">' + s.prohry + '</div><div class="modal-stat-label">Prohry</div></div>' +
            '<div class="modal-stat-item rate"><div class="modal-stat-value">' + winRate + '%</div><div class="modal-stat-label">Úspěšnost</div></div>' +
            '</div>' +
            ((forma || nejSouperi) ?
                '<div class="modal-section" style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;padding:10px 14px">' +
                (forma ? '<div><div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text2);margin-bottom:5px">Forma</div><div class="form-dots" style="gap:4px">' + formaHtml + '</div></div>' : '') +
                (nejSouperi ? '<div style="flex:1;min-width:180px"><div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text2);margin-bottom:5px">Nejčastější soupeři</div><div class="opponent-pills" style="gap:4px">' + nejSouperi + '</div></div>' : '') +
                '</div>'
            : '') +
            '<div class="modal-section no-pad"><div class="modal-section-title" style="padding:8px 14px 4px">Zápasy</div>' +
            '<table class="standings-table"><thead><tr class="standings-thead">' +
            '<th class="th-name" style="width:60px">Disciplína</th><th class="th-name">Soupeř / Tým</th>' +
            '<th class="th-num" style="width:28px">V/P</th><th class="th-num">Skóre</th>' +
            '</tr></thead><tbody>' + matchTableRows + '</tbody></table></div>';

        document.body.classList.add('modal-open');
        modal.style.display = 'block';
    },

    zobrazitDetailTymu(tym) {
        let soutezProTabulku = App.aktualni_soutez;
        let tabulkaData = Statistics.vypocitejTabulku(soutezProTabulku);
        let t = tabulkaData[tym];
        if (!t && App.aktualni_soutez.includes('prvni-liga')) {
            soutezProTabulku = App.aktualni_soutez === 'prvni-liga-vychod' ? 'prvni-liga-zapad' : 'prvni-liga-vychod';
            tabulkaData = Statistics.vypocitejTabulku(soutezProTabulku);
            t = tabulkaData[tym];
        }
        if (!t) return;

        const modal = document.getElementById('tymModal');
        document.getElementById('modalTymNazev').textContent = tym;
        document.getElementById('modalTymInfo').textContent = t.utkani + ' utkání · ' + t.vyhry + 'V / ' + t.prohry + 'P · ' + t.body + ' bodů';

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

        const domaciZ = zapasyTymu.filter(z => z.tymDomaci === tym);
        const hosteZ = zapasyTymu.filter(z => z.tymHoste === tym);
        let dv = 0, dp = 0, hv = 0, hp = 0;
        domaciZ.forEach(z => { if (!Statistics.isNeodehrano(z)) { const v = Statistics.parseVysledek(z.vysledek); if (v.domaci > v.hoste) dv++; else dp++; } });
        hosteZ.forEach(z => { if (!Statistics.isNeodehrano(z)) { const v = Statistics.parseVysledek(z.vysledek); if (v.hoste > v.domaci) hv++; else hp++; } });

        // Group into utkani then by kolo
        const utkaniMap = {};
        zapasyTymu.forEach(z => {
            const jeDom = z.tymDomaci === tym;
            const souper = jeDom ? z.tymHoste : z.tymDomaci;
            const klic = z.kolo + '§' + souper;
            if (!utkaniMap[klic]) utkaniMap[klic] = { kolo: z.kolo, datum: z.datum, souper, doma: jeDom, zapasy: [] };
            utkaniMap[klic].zapasy.push(z);
        });

        const kolaMap = {};
        Object.values(utkaniMap).forEach(u => {
            if (!kolaMap[u.kolo]) kolaMap[u.kolo] = [];
            kolaMap[u.kolo].push(u);
        });

        const teamMatchRows = this._sortKola(Object.keys(kolaMap)).flatMap(kolo => {
            const utk = kolaMap[kolo];
            const koloLabel = this._koloLabel(kolo);
            return utk.map((u, i) => {
                let vyhrane = 0, prohrane = 0;
                u.zapasy.forEach(z => {
                    if (!Statistics.isNeodehrano(z)) {
                        const v = Statistics.parseVysledek(z.vysledek);
                        if (u.doma ? (v.domaci > v.hoste) : (v.hoste > v.domaci)) vyhrane++; else prohrane++;
                    }
                });
                const remiza = vyhrane === prohrane && vyhrane > 0;
                const vyhrano = vyhrane > prohrane;
                const rc = remiza ? '' : (vyhrano ? 'stats-win' : 'stats-loss');
                return '<tr class="stats-row">' +
                    '<td class="stats-cell" style="color:var(--muted);font-size:0.68rem;white-space:nowrap">' + (i === 0 ? koloLabel : '') + '</td>' +
                    '<td class="stats-cell stats-name clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(u.souper) + '\')">' + Statistics.escapeHtml(u.souper) + '</td>' +
                    '<td class="stats-cell stats-num" style="color:var(--muted);font-size:0.68rem">' + (u.doma ? 'D' : 'V') + '</td>' +
                    '<td class="stats-cell stats-num" style="font-weight:700">' + vyhrane + ':' + prohrane + '</td>' +
                    '<td class="stats-cell stats-num ' + rc + '" style="font-weight:700">' + (remiza ? 'R' : (vyhrano ? 'V' : 'P')) + '</td>' +
                    '</tr>';
            });
        }).join('');

        // Players
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

        const hraciHtml = Object.entries(hraci)
            .sort((a, b) => b[1].vyhry - a[1].vyhry || b[1].zapasy - a[1].zapasy)
            .map(([h, st], idx) => {
                const wr = ((st.vyhry / st.zapasy) * 100).toFixed(1);
                return '<tr class="stats-row">' +
                    '<td class="stats-cell stats-pos">' + (idx + 1) + '</td>' +
                    '<td class="stats-cell stats-name clickable" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(h) + '\')">' + Statistics.escapeHtml(h) + '</td>' +
                    '<td class="stats-cell stats-num">' + st.zapasy + '</td>' +
                    '<td class="stats-cell stats-num stats-win">' + st.vyhry + '</td>' +
                    '<td class="stats-cell stats-num stats-loss">' + st.prohry + '</td>' +
                    '<td class="stats-cell stats-num ' + (parseFloat(wr) >= 50 ? 'stats-winrate-good' : 'stats-winrate-bad') + '">' + wr + '%</td>' +
                    '</tr>';
            }).join('');

        document.getElementById('modalTymObsah').innerHTML =
            '<div class="modal-stats-bar">' +
            '<div class="modal-stat-item win"><div class="modal-stat-value">' + (dv + hv) + '</div><div class="modal-stat-label">Výhry</div></div>' +
            '<div class="modal-stat-item loss"><div class="modal-stat-value">' + (dp + hp) + '</div><div class="modal-stat-label">Prohry</div></div>' +
            '<div class="modal-stat-item"><div class="modal-stat-value">' + dv + '/' + dp + '</div><div class="modal-stat-label">Doma V/P</div></div>' +
            '<div class="modal-stat-item"><div class="modal-stat-value">' + hv + '/' + hp + '</div><div class="modal-stat-label">Venku V/P</div></div>' +
            '</div>' +
            '<div class="modal-section no-pad"><div class="modal-section-title" style="padding:10px 14px 4px">Výsledky dle kola</div>' +
            '<table class="standings-table"><thead><tr class="standings-thead">' +
            '<th class="th-name" style="width:60px">Kolo</th><th class="th-name">Soupeř</th>' +
            '<th class="th-num" style="width:28px"></th><th class="th-num">Výsl.</th><th class="th-num">Stav</th>' +
            '</tr></thead><tbody>' + teamMatchRows + '</tbody></table></div>' +
            '<div class="modal-section no-pad"><div class="modal-section-title" style="padding:10px 14px 6px">Hráči sezóny (' + Object.keys(hraci).length + ')</div>' +
            '<table class="standings-table"><thead><tr class="standings-thead">' +
            '<th class="th-pos">#</th><th class="th-name">Hráč</th>' +
            '<th class="th-num">Z</th><th class="th-num">V</th><th class="th-num">P</th><th class="th-num">Win%</th>' +
            '</tr></thead><tbody>' + hraciHtml + '</tbody></table></div>';

        document.body.classList.add('modal-open');
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

        const hracLink = jmeno =>
            '<span class="clickable" onclick="Modals.zobrazitDetailHrace(\'' + Statistics.escapeAttr(jmeno) + '\')">' + Statistics.escapeHtml(jmeno) + '</span>';

        const hracyHtml = pole => {
            if (!pole || pole === 'SKREČ') return '<span style="color:var(--draw);font-weight:600">SKREČ</span>';
            return Statistics.getHraciFromTeam(pole).map(h => hracLink(h)).join(', ');
        };

        const radky = result.zapasy.map(z => {
            const v = Statistics.parseVysledek(z.vysledek);
            const neodehrano = Statistics.isNeodehrano(z);
            const skrecZapas = Statistics.isSkrec(z);
            const vyhralDomaci = v.domaci > v.hoste;
            const rowCls = neodehrano ? 'match-detail-pending' : (skrecZapas ? 'match-detail-screc' : (vyhralDomaci ? 'match-detail-home' : 'match-detail-away'));
            return '<tr class="text-xs ' + rowCls + '">' +
                '<td class="stats-cell">' + Statistics.escapeHtml(z.disciplina || '') + '</td>' +
                '<td class="stats-cell">' + hracyHtml(z.domaci) + '</td>' +
                '<td class="stats-cell">' + hracyHtml(z.hoste) + '</td>' +
                '<td class="stats-cell stats-num" style="font-weight:700">' + (neodehrano ? '–' : z.vysledek) + '</td>' +
                '<td class="stats-cell stats-num" style="color:var(--muted)">' + (z.sety || '–') + '</td>' +
                '</tr>';
        }).join('');

        document.getElementById('modalUtkaniObsah').innerHTML =
            '<div class="overflow-x-auto"><table class="standings-table">' +
            '<thead><tr class="standings-thead">' +
            '<th class="th-name">Disciplína</th><th class="th-name">Domácí</th>' +
            '<th class="th-name">Hosté</th><th class="th-num">Výsl.</th><th class="th-num">Skóre</th>' +
            '</tr></thead><tbody>' + radky + '</tbody></table></div>';

        document.body.classList.add('modal-open');
        modal.style.display = 'block';
    },

    zavritModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        if (!document.querySelector('.modal[style*="display: block"], .modal[style*="display:block"]')) {
            document.body.classList.remove('modal-open');
        }
    }
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        if (!document.querySelector('.modal[style*="display: block"], .modal[style*="display:block"]')) {
            document.body.classList.remove('modal-open');
        }
    }
};
