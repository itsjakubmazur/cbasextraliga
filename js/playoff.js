const Playoff = {
    _matchDetails: {},

    _aktualniSerieConfig(soutez) {
        const konfig = Data.getKonfigurace(App.aktualni_rocnik);
        const DEFAULT = { celkemHer: 9, remizaPri: 4 };
        return (konfig.serie && konfig.serie[soutez]) || DEFAULT;
    },

    zobrazitDetail(key) {
        const result = this._matchDetails[key];
        if (result) Modals.zobrazitDetailUtkani(result);
    },

    render(aktualni_soutez) {
        const container = document.getElementById('playoffObsah');
        if (!container) return;
        const typ = aktualni_soutez.includes('prvni-liga') ? 'liga' : 'extraliga';
        container.innerHTML = this.renderByKonfigurace(typ);
    },

    // Sjednoceny dispatcher pro tvar play-off pavouka podle konfigurace dane
    // sezony (Data.getKonfigurace(App.aktualni_rocnik)) - pouziva ho jak zivy
    // sezony pohled (render() vyse), tak prohlizec historickych rocniku
    // (drive duplikovano v App._renderHistorickyPlayoff).
    renderByKonfigurace(typ) {
        const konfig = Data.getKonfigurace(App.aktualni_rocnik);
        if (typ === 'extraliga') {
            const format = konfig.extraliga_playoff || 'QF+SF+F';
            const tabulkaData = Statistics.vypocitejTabulku('extraliga');
            let tymy = this.seraditTymy(tabulkaData);
            const res = this.getPlayoffResults('extraliga');
            if (tymy.length < 6) tymy = this._deriveExtraligaTeamsFromResults(res);
            if (format === 'QF+SF+F+3rd') return this.renderExtraligaBracketWithThirdPlace(tymy, tabulkaData, res);
            return this.renderExtraligaBracket(tymy, tabulkaData, res);
        }

        const format = konfig.prvni_liga_playoff || 'combined-8';
        switch (format) {
            case 'combined-4': return this.renderPrvniLigaCombined4();
            case 'separate-SF+F': return this.renderPrvniLigaSeparate('SF');
            case 'separate-QF+SF+F+3rd': return this.renderPrvniLigaSeparate('QF');
            default: return this.renderPrvniLigaBracket();
        }
    },

    // ── Baráž ────────────────────────────────────────────────────────────────

    // Returns HTML for the baráž bracket. Can render into any container.
    renderBaraze() {
        const rocnik = App.aktualni_rocnik;
        const konfig = Data.getKonfigurace(rocnik);
        const format = konfig.baraze || 'single';
        const zapasy = Data.zapasy['baraze'] || [];

        if (zapasy.length === 0) {
            return '<p style="color:var(--muted);text-align:center;padding:20px 0;font-size:0.85rem">Žádná data baráže.</p>';
        }

        return format === 'round-robin-3'
            ? this._renderBarazeRoundRobin(zapasy)
            : this._renderBarazeSingleMatch(zapasy);
    },

    _renderBarazeSingleMatch(zapasy) {
        // Aggregate all games into one series between the two teams
        const res = {};
        zapasy.forEach(z => {
            const klic = [z.tymDomaci, z.tymHoste].sort().join('|||');
            if (!res[klic]) res[klic] = { tym1: z.tymDomaci, tym2: z.tymHoste, kolo: 'F', zapasy: [] };
            res[klic].zapasy.push(z);
        });
        Object.values(res).forEach(r => this._vypocitejSerii(r, this._aktualniSerieConfig('baraze')));

        const serie = Object.values(res)[0];
        if (!serie) return '<p style="color:var(--muted);text-align:center;padding:20px 0;font-size:0.85rem">Žádná data.</p>';

        const vitez = serie.vitez;
        const porazeny = serie.porazeny;

        const zzBadge = serie.zlatyZapas ? '<span class="playoff-zz-badge" title="Zlatý zápas">ZZ</span>' : '';
        const resultHtml = serie.skore1 !== undefined
            ? '<div class="playoff-series-result">' + serie.skore1 + ':' + serie.skore2 + zzBadge + '</div>'
            : '';

        let onclickAttr = '';
        if (serie.zapasy.length > 0) {
            const key = 'BARAZE-' + [serie.tym1, serie.tym2].sort().join('-');
            this._matchDetails[key] = serie;
            onclickAttr = ' onclick="Playoff.zobrazitDetail(\'' + Statistics.escapeAttr(key) + '\')" style="cursor:pointer"';
        }

        const t1Cls = vitez === serie.tym1 ? 'playoff-team-green' : (porazeny === serie.tym1 ? 'playoff-team-red' : 'playoff-team-blue');
        const t2Cls = vitez === serie.tym2 ? 'playoff-team-green' : (porazeny === serie.tym2 ? 'playoff-team-red' : 'playoff-team-blue');

        const html = '<div class="baraze-wrapper">' +
            '<div class="baraze-match-box"' + onclickAttr + '>' +
            '<div class="baraze-label">Baráž o Extraligu</div>' +
            '<div class="baraze-teams">' +
            '<div class="baraze-team ' + t1Cls + '">' +
            '<span class="baraze-badge" title="1. liga">1L</span>' +
            '<span class="baraze-team-name">' + Statistics.escapeHtml(serie.tym1) + '</span>' +
            (serie.skore1 !== undefined ? '<span class="playoff-series-score">' + serie.skore1 + '</span>' : '') +
            '</div>' +
            '<div class="baraze-vs">vs</div>' +
            '<div class="baraze-team ' + t2Cls + '">' +
            '<span class="baraze-badge" title="Extraliga">EL</span>' +
            '<span class="baraze-team-name">' + Statistics.escapeHtml(serie.tym2) + '</span>' +
            (serie.skore2 !== undefined ? '<span class="playoff-series-score">' + serie.skore2 + '</span>' : '') +
            '</div>' +
            '</div>' +
            resultHtml +
            '</div>' +
            this._renderBarazeSingleMatchVitez(vitez) +
            '</div>';
        return html;
    },

    _renderBarazeSingleMatchVitez(vitez) {
        if (!vitez) return '';
        return '<div class="baraze-winner-banner">✓ ' + Statistics.escapeHtml(vitez) + ' si vybojoval extraligovou příslušnost</div>';
    },

    _renderBarazeRoundRobin(zapasy) {
        // 3 teams, each pair plays a series. kolo = 'RR' (or any non-playoff kolo).
        // Group matches by team pair.
        const serie = {};
        zapasy.forEach(z => {
            const klic = [z.tymDomaci, z.tymHoste].sort().join('|||');
            if (!serie[klic]) serie[klic] = { tym1: z.tymDomaci, tym2: z.tymHoste, kolo: 'RR', zapasy: [] };
            serie[klic].zapasy.push(z);
        });
        Object.values(serie).forEach(r => this._vypocitejSerii(r, this._aktualniSerieConfig('baraze')));

        // Build standings table
        const body = {};
        Object.values(serie).forEach(r => {
            [r.tym1, r.tym2].forEach(t => { if (!body[t]) body[t] = { body: 0, v: 0, p: 0 }; });
            if (r.vitez) {
                body[r.vitez].body += 2;
                body[r.vitez].v++;
                body[r.porazeny].p++;
            } else if (r.skore1 !== undefined) {
                // No winner yet
                body[r.tym1].body += 0;
                body[r.tym2].body += 0;
            }
        });
        const tymy = Object.keys(body).sort((a, b) => body[b].body - body[a].body);

        const standingsRows = tymy.map((t, i) => {
            return '<tr class="' + (i === 0 ? 'rr-winner-row' : '') + '">' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + Statistics.escapeHtml(t) + '</td>' +
                '<td style="text-align:center">' + (body[t].v + body[t].p) + '</td>' +
                '<td class="rr-win" style="text-align:center">' + body[t].v + '</td>' +
                '<td class="rr-loss" style="text-align:center">' + body[t].p + '</td>' +
                '<td style="text-align:center;font-weight:700">' + body[t].body + '</td>' +
                '</tr>';
        }).join('');

        const standings = '<div class="rr-standings">' +
            '<div class="rr-section-title">Tabulka baráže</div>' +
            '<table class="rr-table"><thead><tr>' +
            '<th>#</th><th style="text-align:left">Tým</th>' +
            '<th>U</th><th>V</th><th>P</th><th>Body</th>' +
            '</tr></thead><tbody>' + standingsRows + '</tbody></table>' +
            (tymy[0] ? '<div class="playoff-winner-small">✓ Vítěz: ' + Statistics.escapeHtml(tymy[0]) + '</div>' : '') +
            '</div>';

        const matchBoxes = Object.values(serie).map(r => {
            const zzBadge = r.zlatyZapas ? '<span class="playoff-zz-badge">ZZ</span>' : '';
            let onclickAttr = '';
            if (r.zapasy.length > 0) {
                const key = 'BARAZE-RR-' + [r.tym1, r.tym2].sort().join('-');
                this._matchDetails[key] = r;
                onclickAttr = ' onclick="Playoff.zobrazitDetail(\'' + Statistics.escapeAttr(key) + '\')" style="cursor:pointer"';
            }
            return '<div class="playoff-match"' + onclickAttr + '>' +
                this.teamCard(r.tym1, '', r.vitez === r.tym1 ? 'playoff-team-green' : 'playoff-team-blue', null, r.skore1) +
                '<div class="playoff-vs">vs</div>' +
                this.teamCard(r.tym2, '', r.vitez === r.tym2 ? 'playoff-team-green' : 'playoff-team-blue', null, r.skore2) +
                (r.skore1 !== undefined ? '<div class="playoff-series-result">' + r.skore1 + ':' + r.skore2 + zzBadge + '</div>' : '') +
                '</div>';
        }).join('');

        return '<div class="baraze-wrapper">' + standings +
            '<div class="rr-section-title">Výsledky utkání</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' + matchBoxes + '</div></div>';
    },

    // ── Extraliga s utkáním o 3. místo (2021/22 – 2023/24) ───────────────────

    renderExtraligaBracketWithThirdPlace(tymy, data, playoffResults) {
        // Same structure as renderExtraligaBracket but adds a 3rd place match.
        const bracketHtml = this.renderExtraligaBracket(tymy, data, playoffResults);

        const res = playoffResults || {};
        const sfRes1 = Object.values(res).find(r => r.kolo === 'SF' && (r.tym1 === tymy[0] || r.tym2 === tymy[0]));
        const sfRes2 = Object.values(res).find(r => r.kolo === 'SF' && r !== sfRes1 && r.kolo === 'SF');

        const porazeny1 = sfRes1?.porazeny || null;
        const porazeny2 = sfRes2?.porazeny || null;

        const trzRes = (porazeny1 && porazeny2) ? this.findResult(res, '3M', porazeny1, porazeny2) : null;

        if (!porazeny1 && !porazeny2 && !trzRes) return bracketHtml;

        const trzHtml = '<div class="trzplace-section">' +
            '<div class="trzplace-title">Utkání o 3. místo</div>' +
            this.matchBox(
                porazeny1 ? this.teamCard(porazeny1, 'SF', trzRes?.vitez === porazeny1 ? 'playoff-team-orange' : 'playoff-team-blue', null, trzRes ? (trzRes.tym1 === porazeny1 ? trzRes.skore1 : trzRes.skore2) : undefined) : this.pendingCard('Poražený SF 1'),
                porazeny2 ? this.teamCard(porazeny2, 'SF', trzRes?.vitez === porazeny2 ? 'playoff-team-orange' : 'playoff-team-blue', null, trzRes ? (trzRes.tym1 === porazeny2 ? trzRes.skore1 : trzRes.skore2) : undefined) : this.pendingCard('Poražený SF 2'),
                'O 3. místo',
                trzRes ? trzRes.skore1 + ':' + trzRes.skore2 : null,
                trzRes
            ) +
            (trzRes?.vitez ? '<div class="trzplace-winner">' + Statistics.escapeHtml(trzRes.vitez) + ' – 3. místo</div>' : '') +
            '</div>';

        return bracketHtml + trzHtml;
    },

    // ── 1. liga – combined 4 teams (2024/25) ─────────────────────────────────
    // 2 teams from East + 2 teams from West → SF crossover → F

    renderPrvniLigaCombined4() {
        const res = this.getPlayoffResultsPrvniLiga();

        // Derive SF pairs from results – no table seedings needed
        const allSfMatches = Object.values(res).filter(r => r.kolo === 'SF')
            .sort((a, b) => [a.tym1, a.tym2].sort().join('') < [b.tym1, b.tym2].sort().join('') ? -1 : 1);

        // Try table-based seedings for E/W badges (works for current season, empty for historical)
        const tabulkaV = Statistics.vypocitejTabulku('prvni-liga-vychod');
        const tabulkaZ = Statistics.vypocitejTabulku('prvni-liga-zapad');
        const tymyV = this.seraditTymy(tabulkaV);
        const tymyZ = this.seraditTymy(tabulkaZ);
        const eastTeams = new Set(tymyV);
        const westTeams = new Set(tymyZ);
        const getConf = (t) => eastTeams.has(t) ? 'V' : (westTeams.has(t) ? 'Z' : null);

        // Match SF results to sfRes1/sfRes2
        let sfRes1, sfRes2;
        if (tymyV.length >= 2 && tymyZ.length >= 2) {
            // Current season – use table crossover
            const sfTym1A = tymyV[0], sfTym1B = tymyZ[1];
            const sfTym2A = tymyV[1], sfTym2B = tymyZ[0];
            sfRes1 = this.findResult(res, 'SF', sfTym1A, sfTym1B);
            sfRes2 = this.findResult(res, 'SF', sfTym2A, sfTym2B);
        }
        // Historical fallback – take SF matches directly from results
        if (!sfRes1 && !sfRes2 && allSfMatches.length > 0) {
            sfRes1 = allSfMatches[0] || null;
            sfRes2 = allSfMatches[1] || null;
        }

        const sfVitez1 = sfRes1?.vitez || null;
        const sfVitez2 = sfRes2?.vitez || null;

        // Derive team names from sfRes objects (works for both current and historical mode)
        const sf1t1 = sfRes1?.tym1 || null;
        const sf1t2 = sfRes1?.tym2 || null;
        const sf2t1 = sfRes2?.tym1 || null;
        const sf2t2 = sfRes2?.tym2 || null;

        const sf1 = this.matchBox(
            sf1t1 ? this.teamCard(sf1t1, '1.', sfVitez1 === sf1t1 ? 'playoff-team-green' : 'playoff-team-east', getConf(sf1t1), sfRes1.tym1 === sf1t1 ? sfRes1.skore1 : sfRes1.skore2) : this.pendingCard('Tým SF'),
            sf1t2 ? this.teamCard(sf1t2, '2.', sfVitez1 === sf1t2 ? 'playoff-team-green' : 'playoff-team-west', getConf(sf1t2), sfRes1.tym1 === sf1t2 ? sfRes1.skore1 : sfRes1.skore2) : this.pendingCard('Tým SF'),
            'Semifinále 1', sfRes1 ? sfRes1.skore1 + ':' + sfRes1.skore2 : null, sfRes1
        );
        const sf2 = this.matchBox(
            sf2t1 ? this.teamCard(sf2t1, '2.', sfVitez2 === sf2t1 ? 'playoff-team-green' : 'playoff-team-east', getConf(sf2t1), sfRes2.tym1 === sf2t1 ? sfRes2.skore1 : sfRes2.skore2) : this.pendingCard('Tým SF'),
            sf2t2 ? this.teamCard(sf2t2, '1.', sfVitez2 === sf2t2 ? 'playoff-team-green' : 'playoff-team-west', getConf(sf2t2), sfRes2.tym1 === sf2t2 ? sfRes2.skore1 : sfRes2.skore2) : this.pendingCard('Tým SF'),
            'Semifinále 2', sfRes2 ? sfRes2.skore1 + ':' + sfRes2.skore2 : null, sfRes2
        );

        const fTym1 = sfVitez1, fTym2 = sfVitez2;
        const fRes = (fTym1 && fTym2) ? this.findResult(res, 'F', fTym1, fTym2) : null;
        const final_ = this.matchBox(
            fTym1 ? this.teamCard(fTym1, 'SF', fRes?.vitez === fTym1 ? 'playoff-team-green' : 'playoff-team-blue', null, fRes ? (fRes.tym1 === fTym1 ? fRes.skore1 : fRes.skore2) : undefined) : this.pendingCard('Vítěz SF 1'),
            fTym2 ? this.teamCard(fTym2, 'SF', fRes?.vitez === fTym2 ? 'playoff-team-green' : 'playoff-team-blue', null, fRes ? (fRes.tym1 === fTym2 ? fRes.skore1 : fRes.skore2) : undefined) : this.pendingCard('Vítěz SF 2'),
            'Finále', fRes ? fRes.skore1 + ':' + fRes.skore2 : null, fRes
        );

        return '<div class="bracket-wrapper">' +
            '<div class="bracket-round bracket-round-sf"><div class="bracket-round-title">Semifinále</div>' +
            '<div class="bracket-matches bracket-matches-2">' +
            '<div class="bracket-match-slot">' + sf1 + '</div>' +
            '<div class="bracket-match-slot">' + sf2 + '</div>' +
            '</div></div>' +
            '<div class="bracket-connector-col"><svg class="bracket-lines" preserveAspectRatio="none"></svg></div>' +
            '<div class="bracket-round bracket-round-f"><div class="bracket-round-title">Finále</div>' +
            '<div class="bracket-matches bracket-matches-1"><div class="bracket-match-slot">' + final_ + '</div></div>' +
            '</div></div>' +
            '<div class="playoff-legend" style="margin-top:12px">' +
            '<span class="playoff-legend-item"><span class="playoff-legend-dot playoff-legend-dot-east"></span> Východ</span>' +
            '<span class="playoff-legend-item"><span class="playoff-legend-dot playoff-legend-dot-west"></span> Západ</span>' +
            '</div>';
    },

    // ── 1. liga – separate E/W playoffs ──────────────────────────────────────
    // firstKolo: 'QF' (2021/22) or 'SF' (2022/23, 2023/24)

    renderPrvniLigaSeparate(firstKolo) {
        const resV = this._getPlayoffResultsFromSoutez('prvni-liga-vychod');
        const resZ = this._getPlayoffResultsFromSoutez('prvni-liga-zapad');

        const htmlV = this._renderSeparateGroup(resV, 'Východ', firstKolo);
        const htmlZ = this._renderSeparateGroup(resZ, 'Západ', firstKolo);

        return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">' + htmlV + htmlZ + '</div>';
    },

    _getPlayoffResultsFromSoutez(soutez) {
        const zapasy = Data.zapasy[soutez] || [];
        const results = {};
        zapasy.forEach(z => {
            if (!Statistics.isPlayoffKolo(z.kolo)) return;
            const kolo = Statistics.normalizeKolo(z.kolo);
            const klic = kolo + '-' + [z.tymDomaci, z.tymHoste].sort().join('-');
            if (!results[klic]) results[klic] = { kolo, tym1: z.tymDomaci, tym2: z.tymHoste, zapasy: [] };
            results[klic].zapasy.push(z);
        });
        Object.values(results).forEach(r => this._vypocitejSerii(r, this._aktualniSerieConfig(soutez)));
        return results;
    },

    _renderSeparateGroup(results, groupName, firstKolo) {
        const roundOrder = firstKolo === 'QF' ? ['QF', 'SF', 'F', '3M'] : ['SF', 'F', '3M'];
        const roundNames = { 'QF': 'Čtvrtfinále', 'SF': 'Semifinále', 'F': 'Finále', '3M': 'O 3. místo' };

        const byColo = {};
        Object.values(results).forEach(r => {
            if (!byColo[r.kolo]) byColo[r.kolo] = [];
            byColo[r.kolo].push(r);
        });

        let html = '<div class="separate-group">';
        html += '<div class="separate-group-title">' + groupName + '</div>';

        let anyContent = false;
        roundOrder.forEach(kolo => {
            const matches = byColo[kolo] || [];
            if (matches.length === 0) return;
            anyContent = true;
            html += '<div style="margin-bottom:12px">';
            html += '<div class="separate-round-label">' + roundNames[kolo] + '</div>';
            matches.forEach(r => {
                html += this.matchBox(
                    this.teamCard(r.tym1, '', r.vitez === r.tym1 ? 'playoff-team-green' : 'playoff-team-blue', null, r.skore1),
                    this.teamCard(r.tym2, '', r.vitez === r.tym2 ? 'playoff-team-green' : 'playoff-team-blue', null, r.skore2),
                    null,
                    r.skore1 !== undefined ? r.skore1 + ':' + r.skore2 : null,
                    r
                );
            });
            html += '</div>';
        });

        if (!anyContent) {
            html += '<p style="color:var(--muted);font-size:0.8rem;text-align:center;padding:12px 0">Žádná data.</p>';
        }

        // Group champion
        const final_ = (byColo['F'] || [])[0];
        if (final_?.vitez) {
            html += '<div class="group-winner-banner">🏆 Vítěz ' + groupName + ': ' + Statistics.escapeHtml(final_.vitez) + '</div>';
        }

        html += '</div>';
        return html;
    },

    // Shared helper: calculate series result from array of match records.
    // serieConfig = { celkemHer, remizaPri } - kolik her tvori serii a pri
    // jakem skore (X:X) se ceka/rozhodl zlaty zapas. Default reprodukuje
    // puvodni natvrdo zadratovanou hodnotu (9 her, remiza pri 4:4).
    _vypocitejSerii(r, serieConfig) {
        const cfg = serieConfig || { celkemHer: 9, remizaPri: 4 };
        let v1 = 0, v2 = 0, odehranoHer = 0;
        r.zapasy.forEach(z => {
            if (Statistics.isNeodehrano(z)) return;
            const v = Statistics.parseVysledek(z.vysledek);
            odehranoHer++;
            const jeTym1Domaci = z.tymDomaci === r.tym1;
            if (jeTym1Domaci) {
                if (v.domaci > v.hoste) v1++; else v2++;
            } else {
                if (v.hoste > v.domaci) v1++; else v2++;
            }
        });
        r.skore1 = v1;
        r.skore2 = v2;
        r.odehranoHer = odehranoHer;
        // zlatyZapas = true pokud je stav remizaPri:remizaPri (čeká se) NEBO
        // (remizaPri+1):remizaPri po celkemHer hrach (rozhodl zlaty zapas)
        const remiza = v1 === cfg.remizaPri && v2 === cfg.remizaPri && odehranoHer >= 2 * cfg.remizaPri;
        const rozhodnutZZ = odehranoHer >= cfg.celkemHer &&
            ((v1 === cfg.remizaPri + 1 && v2 === cfg.remizaPri) || (v2 === cfg.remizaPri + 1 && v1 === cfg.remizaPri));
        r.zlatyZapas = remiza || rozhodnutZZ;
        r.vitez = v1 > v2 ? r.tym1 : (v2 > v1 ? r.tym2 : null);
        r.porazeny = r.vitez ? (r.vitez === r.tym1 ? r.tym2 : r.tym1) : null;
    },

    // Extract playoff results from match data, grouped by round and matchup
    getPlayoffResults(soutez) {
        const zapasy = Data.zapasy[soutez] || [];
        const results = {};

        zapasy.forEach(z => {
            if (!Statistics.isPlayoffKolo(z.kolo)) return;
            const kolo = Statistics.normalizeKolo(z.kolo);
            const klic = kolo + '-' + [z.tymDomaci, z.tymHoste].sort().join('-');
            if (!results[klic]) {
                results[klic] = {
                    kolo: kolo,
                    tym1: z.tymDomaci,
                    tym2: z.tymHoste,
                    zapasy: []
                };
            }
            results[klic].zapasy.push(z);
        });

        Object.values(results).forEach(r => this._vypocitejSerii(r, this._aktualniSerieConfig(soutez)));
        return results;
    },

    getPlayoffResultsPrvniLiga() {
        const zapasy = Data.zapasy['prvni-liga-playoff'] || [];
        const results = {};

        zapasy.forEach(z => {
            const kolo = Statistics.normalizeKolo(z.kolo || 'QF');
            const klic = kolo + '-' + [z.tymDomaci, z.tymHoste].sort().join('-');
            if (!results[klic]) {
                results[klic] = {
                    kolo: kolo,
                    tym1: z.tymDomaci,
                    tym2: z.tymHoste,
                    zapasy: []
                };
            }
            results[klic].zapasy.push(z);
        });

        Object.values(results).forEach(r => this._vypocitejSerii(r, this._aktualniSerieConfig('prvni-liga-playoff')));
        return results;
    },

    // Find a result for a specific matchup between two teams in a given round
    findResult(results, kolo, tym1, tym2) {
        const klic1 = kolo + '-' + [tym1, tym2].sort().join('-');
        return results[klic1] || null;
    },

    // Find winner of a match involving a specific team in a given round
    findWinnerFromRound(results, kolo, team) {
        return Object.values(results).find(r =>
            r.kolo === kolo && (r.tym1 === team || r.tym2 === team)
        );
    },

    seraditTymy(tabulkaData) {
        return Statistics.seraditTymyPodleTabulky(tabulkaData);
    },

    teamCard(name, seed, highlight, conference, seriesScore) {
        const cls = highlight || '';
        const confBadge = conference
            ? '<span class="playoff-conf-badge playoff-conf-' + conference + '">' + (conference === 'V' ? 'V' : 'Z') + '</span>'
            : '';
        const scoreHtml = seriesScore !== undefined
            ? '<span class="playoff-series-score">' + seriesScore + '</span>'
            : '';
        const logoUrl = Data.tymLoga && Data.tymLoga[name];
        const logoHtml = logoUrl ? '<img class="playoff-team-logo" src="' + Statistics.escapeAttr(logoUrl) + '" alt="" onerror="this.remove()">' : '';
        return '<div class="playoff-team ' + cls + '">' +
            '<span class="playoff-seed">' + seed + '</span>' +
            confBadge +
            logoHtml +
            '<span class="playoff-team-name clickable" onclick="event.stopPropagation();Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(name) + '\')">' + Statistics.escapeHtml(name) + '</span>' +
            scoreHtml +
            '</div>';
    },

    pendingCard(label) {
        return '<div class="playoff-team playoff-team-pending">' +
            '<span class="playoff-seed">?</span>' +
            '<span class="playoff-team-name">' + label + '</span>' +
            '</div>';
    },

    matchBox(team1Html, team2Html, label, seriesResult, result) {
        let resultHtml = '';
        if (seriesResult) {
            const zzBadge = result?.zlatyZapas
                ? '<span class="playoff-zz-badge" title="Zlatý zápas">ZZ</span>'
                : '';
            resultHtml = '<div class="playoff-series-result">' + seriesResult + zzBadge + '</div>';
        }
        let onclickAttr = '';
        if (result && result.zapasy && result.zapasy.length > 0) {
            const key = result.kolo + '-' + [result.tym1, result.tym2].sort().join('-');
            this._matchDetails[key] = result;
            onclickAttr = ' onclick="Playoff.zobrazitDetail(\'' + Statistics.escapeAttr(key) + '\')" style="cursor:pointer"';
        }
        return '<div class="playoff-match"' + onclickAttr + '>' +
            (label ? '<div class="playoff-match-label">' + label + '</div>' : '') +
            '<div class="playoff-match-teams">' +
            team1Html +
            '<div class="playoff-vs">vs</div>' +
            team2Html +
            '</div>' +
            resultHtml +
            '</div>';
    },

    // Derive synthetic tymy array from playoff results when basic season table is unavailable
    _deriveExtraligaTeamsFromResults(res) {
        const qfMatches = Object.values(res).filter(r => r.kolo === 'QF');
        const sfMatches = Object.values(res).filter(r => r.kolo === 'SF');

        const qfTeams = new Set();
        qfMatches.forEach(r => { qfTeams.add(r.tym1); qfTeams.add(r.tym2); });

        const allSfTeams = new Set();
        sfMatches.forEach(r => { allSfTeams.add(r.tym1); allSfTeams.add(r.tym2); });
        const byeTeams = [...allSfTeams].filter(t => !qfTeams.has(t));

        const tymy = ['?', '?', '?', '?', '?', '?'];
        tymy[0] = byeTeams[0] || '?';
        tymy[1] = byeTeams[1] || '?';
        if (qfMatches[0]) { tymy[2] = qfMatches[0].tym1; tymy[5] = qfMatches[0].tym2; }
        if (qfMatches[1]) { tymy[3] = qfMatches[1].tym1; tymy[4] = qfMatches[1].tym2; }
        return tymy;
    },

    renderExtraligaBracket(tymy, data, playoffResults) {
        if (tymy.length < 6) {
            return '<p style="color:var(--muted);text-align:center;padding:16px 0;font-size:0.85rem">Nedostatek týmů pro zobrazení pavouka.</p>';
        }

        const t = (i) => tymy[i] || '?';
        const res = playoffResults || {};

        // QF results
        const qfRes1 = this.findResult(res, 'QF', t(2), t(5));
        const qfRes2 = this.findResult(res, 'QF', t(3), t(4));
        const qfVitez1 = qfRes1?.vitez || null;
        const qfVitez2 = qfRes2?.vitez || null;

        const qf1 = this.matchBox(
            this.teamCard(t(2), '3.', qfVitez1 === t(2) ? 'playoff-team-green' : 'playoff-team-blue', null, qfRes1 ? (qfRes1.tym1 === t(2) ? qfRes1.skore1 : qfRes1.skore2) : undefined),
            this.teamCard(t(5), '6.', qfVitez1 === t(5) ? 'playoff-team-green' : 'playoff-team-blue', null, qfRes1 ? (qfRes1.tym1 === t(5) ? qfRes1.skore1 : qfRes1.skore2) : undefined),
            'Čtvrtfinále 1',
            qfRes1 ? qfRes1.skore1 + ':' + qfRes1.skore2 : null,
            qfRes1
        );
        const qf2 = this.matchBox(
            this.teamCard(t(3), '4.', qfVitez2 === t(3) ? 'playoff-team-green' : 'playoff-team-blue', null, qfRes2 ? (qfRes2.tym1 === t(3) ? qfRes2.skore1 : qfRes2.skore2) : undefined),
            this.teamCard(t(4), '5.', qfVitez2 === t(4) ? 'playoff-team-green' : 'playoff-team-blue', null, qfRes2 ? (qfRes2.tym1 === t(4) ? qfRes2.skore1 : qfRes2.skore2) : undefined),
            'Čtvrtfinále 2',
            qfRes2 ? qfRes2.skore1 + ':' + qfRes2.skore2 : null,
            qfRes2
        );

        // SF results - seeding based on regular season standings, not QF bracket position
        // #1 plays against the lower-seeded QF winner (worse regular season standing)
        // #2 plays against the higher-seeded QF winner (better regular season standing)
        let sfTym1B = null; // opponent for #1 (lower-seeded QF winner)
        let sfTym2B = null; // opponent for #2 (higher-seeded QF winner)

        if (qfVitez1 && qfVitez2) {
            // Both QF winners known - reseed based on regular season standings
            const seed1 = tymy.indexOf(qfVitez1);
            const seed2 = tymy.indexOf(qfVitez2);
            // Higher index = lower in standings = plays against #1
            if (seed1 > seed2) {
                sfTym1B = qfVitez1; // lower-seeded goes to SF1 vs #1
                sfTym2B = qfVitez2; // higher-seeded goes to SF2 vs #2
            } else {
                sfTym1B = qfVitez2;
                sfTym2B = qfVitez1;
            }
        } else if (qfVitez1) {
            // Only one QF winner known - can't reseed yet, try to find SF match
            const sfCheck = this.findResult(res, 'SF', t(0), qfVitez1);
            if (sfCheck) {
                sfTym1B = qfVitez1;
            } else {
                const sfCheck2 = this.findResult(res, 'SF', t(1), qfVitez1);
                if (sfCheck2) {
                    sfTym2B = qfVitez1;
                }
            }
        } else if (qfVitez2) {
            const sfCheck = this.findResult(res, 'SF', t(0), qfVitez2);
            if (sfCheck) {
                sfTym1B = qfVitez2;
            } else {
                const sfCheck2 = this.findResult(res, 'SF', t(1), qfVitez2);
                if (sfCheck2) {
                    sfTym2B = qfVitez2;
                }
            }
        }

        const sfTym1A = t(0); // 1st seed always in SF1
        const sfTym2A = t(1); // 2nd seed always in SF2

        // Primary lookup by reseeding; fallback to any SF match involving the bye team
        // (needed in historical mode where team order is derived, not from standings)
        let sfRes1 = sfTym1B ? this.findResult(res, 'SF', sfTym1A, sfTym1B) : null;
        if (!sfRes1) sfRes1 = this.findWinnerFromRound(res, 'SF', sfTym1A) || null;
        if (sfRes1) sfTym1B = sfRes1.tym1 === sfTym1A ? sfRes1.tym2 : sfRes1.tym1;

        let sfRes2 = sfTym2B ? this.findResult(res, 'SF', sfTym2A, sfTym2B) : null;
        if (!sfRes2) sfRes2 = this.findWinnerFromRound(res, 'SF', sfTym2A) || null;
        if (sfRes2) sfTym2B = sfRes2.tym1 === sfTym2A ? sfRes2.tym2 : sfRes2.tym1;

        const sfVitez1 = sfRes1?.vitez || null;
        const sfVitez2 = sfRes2?.vitez || null;

        const sf1 = this.matchBox(
            this.teamCard(sfTym1A, '1.', sfVitez1 === sfTym1A ? 'playoff-team-green' : 'playoff-team-green', null, sfRes1 ? (sfRes1.tym1 === sfTym1A ? sfRes1.skore1 : sfRes1.skore2) : undefined),
            sfTym1B
                ? this.teamCard(sfTym1B, 'QF', sfVitez1 === sfTym1B ? 'playoff-team-green' : 'playoff-team-blue', null, sfRes1 ? (sfRes1.tym1 === sfTym1B ? sfRes1.skore1 : sfRes1.skore2) : undefined)
                : this.pendingCard('Níže nasazený z ČF'),
            'Semifinále 1',
            sfRes1 ? sfRes1.skore1 + ':' + sfRes1.skore2 : null,
            sfRes1
        );
        const sf2 = this.matchBox(
            this.teamCard(sfTym2A, '2.', sfVitez2 === sfTym2A ? 'playoff-team-green' : 'playoff-team-green', null, sfRes2 ? (sfRes2.tym1 === sfTym2A ? sfRes2.skore1 : sfRes2.skore2) : undefined),
            sfTym2B
                ? this.teamCard(sfTym2B, 'QF', sfVitez2 === sfTym2B ? 'playoff-team-green' : 'playoff-team-blue', null, sfRes2 ? (sfRes2.tym1 === sfTym2B ? sfRes2.skore1 : sfRes2.skore2) : undefined)
                : this.pendingCard('Výše nasazený z ČF'),
            'Semifinále 2',
            sfRes2 ? sfRes2.skore1 + ':' + sfRes2.skore2 : null,
            sfRes2
        );

        // Final
        const fTym1 = sfVitez1 || null;
        const fTym2 = sfVitez2 || null;
        const fRes = (fTym1 && fTym2) ? this.findResult(res, 'F', fTym1, fTym2) : null;

        const final_ = this.matchBox(
            fTym1
                ? this.teamCard(fTym1, 'SF', fRes?.vitez === fTym1 ? 'playoff-team-green' : 'playoff-team-blue', null, fRes ? (fRes.tym1 === fTym1 ? fRes.skore1 : fRes.skore2) : undefined)
                : this.pendingCard('Vítěz SF 1'),
            fTym2
                ? this.teamCard(fTym2, 'SF', fRes?.vitez === fTym2 ? 'playoff-team-green' : 'playoff-team-blue', null, fRes ? (fRes.tym1 === fTym2 ? fRes.skore1 : fRes.skore2) : undefined)
                : this.pendingCard('Vítěz SF 2'),
            'Finále (Final Four)',
            fRes ? fRes.skore1 + ':' + fRes.skore2 : null,
            fRes
        );

        return '<div class="bracket-wrapper">' +
            '<div class="bracket-round bracket-round-qf">' +
                '<div class="bracket-round-title">Čtvrtfinále</div>' +
                '<div class="bracket-matches bracket-matches-4">' +
                    '<div class="bracket-match-slot">' + qf1 + '</div>' +
                    '<div class="bracket-match-slot">' + qf2 + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bracket-connector-col">' +
                '<svg class="bracket-lines" preserveAspectRatio="none"></svg>' +
            '</div>' +
            '<div class="bracket-round bracket-round-sf">' +
                '<div class="bracket-round-title">Semifinále (Final Four)</div>' +
                '<div class="bracket-matches bracket-matches-2">' +
                    '<div class="bracket-match-slot">' + sf1 + '</div>' +
                    '<div class="bracket-match-slot">' + sf2 + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bracket-connector-col">' +
                '<svg class="bracket-lines" preserveAspectRatio="none"></svg>' +
            '</div>' +
            '<div class="bracket-round bracket-round-f">' +
                '<div class="bracket-round-title">Finále</div>' +
                '<div class="bracket-matches bracket-matches-1">' +
                    '<div class="bracket-match-slot">' + final_ + '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="playoff-legend" style="margin-top:12px">' +
            '<span class="playoff-legend-item"><span class="playoff-legend-dot playoff-legend-dot-green"></span> Přímý postup do Final Four (1.–2.)</span>' +
            '<span class="playoff-legend-item"><span class="playoff-legend-dot playoff-legend-dot-blue"></span> Čtvrtfinále (3.–6.)</span>' +
        '</div>';
    },

    renderPrvniLigaBracket() {
        const tabulkaVychod = Statistics.vypocitejTabulku('prvni-liga-vychod');
        const tabulkaZapad = Statistics.vypocitejTabulku('prvni-liga-zapad');

        const tymyV = this.seraditTymy(tabulkaVychod);
        const tymyZ = this.seraditTymy(tabulkaZapad);

        if (tymyV.length < 4 || tymyZ.length < 4) {
            return '<p style="color:var(--muted);text-align:center;padding:16px 0;font-size:0.85rem">Nedostatek týmů pro zobrazení pavouka.</p>';
        }

        const res = this.getPlayoffResultsPrvniLiga();

        // QF: crossover East vs West
        const qfPairs = [
            { v: 0, z: 3, label: 'Čtvrtfinále 1' }, // 1.V vs 4.Z
            { v: 2, z: 1, label: 'Čtvrtfinále 2' }, // 3.V vs 2.Z
            { v: 1, z: 2, label: 'Čtvrtfinále 3' }, // 2.V vs 3.Z
            { v: 3, z: 0, label: 'Čtvrtfinále 4' }  // 4.V vs 1.Z
        ];

        const qfResults = [];
        const qfBoxes = qfPairs.map((pair, i) => {
            const teamV = tymyV[pair.v];
            const teamZ = tymyZ[pair.z];
            const qfRes = this.findResult(res, 'QF', teamV, teamZ);
            qfResults.push(qfRes);
            const vitez = qfRes?.vitez || null;

            return this.matchBox(
                this.teamCard(teamV, (pair.v + 1) + '.', vitez === teamV ? 'playoff-team-green' : 'playoff-team-east', 'V', qfRes ? (qfRes.tym1 === teamV ? qfRes.skore1 : qfRes.skore2) : undefined),
                this.teamCard(teamZ, (pair.z + 1) + '.', vitez === teamZ ? 'playoff-team-green' : 'playoff-team-west', 'Z', qfRes ? (qfRes.tym1 === teamZ ? qfRes.skore1 : qfRes.skore2) : undefined),
                pair.label,
                qfRes ? qfRes.skore1 + ':' + qfRes.skore2 : null,
                qfRes
            );
        });

        // SF: QF1 winner vs QF2 winner, QF3 winner vs QF4 winner
        const sfTym1A = qfResults[0]?.vitez || null;
        const sfTym1B = qfResults[1]?.vitez || null;
        const sfTym2A = qfResults[2]?.vitez || null;
        const sfTym2B = qfResults[3]?.vitez || null;

        const sfRes1 = (sfTym1A && sfTym1B) ? this.findResult(res, 'SF', sfTym1A, sfTym1B) : null;
        const sfRes2 = (sfTym2A && sfTym2B) ? this.findResult(res, 'SF', sfTym2A, sfTym2B) : null;

        const sf1 = this.matchBox(
            sfTym1A
                ? this.teamCard(sfTym1A, 'QF', sfRes1?.vitez === sfTym1A ? 'playoff-team-green' : 'playoff-team-blue', null, sfRes1 ? (sfRes1.tym1 === sfTym1A ? sfRes1.skore1 : sfRes1.skore2) : undefined)
                : this.pendingCard('Vítěz ČF 1'),
            sfTym1B
                ? this.teamCard(sfTym1B, 'QF', sfRes1?.vitez === sfTym1B ? 'playoff-team-green' : 'playoff-team-blue', null, sfRes1 ? (sfRes1.tym1 === sfTym1B ? sfRes1.skore1 : sfRes1.skore2) : undefined)
                : this.pendingCard('Vítěz ČF 2'),
            'Semifinále 1',
            sfRes1 ? sfRes1.skore1 + ':' + sfRes1.skore2 : null,
            sfRes1
        );
        const sf2 = this.matchBox(
            sfTym2A
                ? this.teamCard(sfTym2A, 'QF', sfRes2?.vitez === sfTym2A ? 'playoff-team-green' : 'playoff-team-blue', null, sfRes2 ? (sfRes2.tym1 === sfTym2A ? sfRes2.skore1 : sfRes2.skore2) : undefined)
                : this.pendingCard('Vítěz ČF 3'),
            sfTym2B
                ? this.teamCard(sfTym2B, 'QF', sfRes2?.vitez === sfTym2B ? 'playoff-team-green' : 'playoff-team-blue', null, sfRes2 ? (sfRes2.tym1 === sfTym2B ? sfRes2.skore1 : sfRes2.skore2) : undefined)
                : this.pendingCard('Vítěz ČF 4'),
            'Semifinále 2',
            sfRes2 ? sfRes2.skore1 + ':' + sfRes2.skore2 : null,
            sfRes2
        );

        // Final
        const fTym1 = sfRes1?.vitez || null;
        const fTym2 = sfRes2?.vitez || null;
        const fRes = (fTym1 && fTym2) ? this.findResult(res, 'F', fTym1, fTym2) : null;

        const final_ = this.matchBox(
            fTym1
                ? this.teamCard(fTym1, 'SF', fRes?.vitez === fTym1 ? 'playoff-team-green' : 'playoff-team-blue', null, fRes ? (fRes.tym1 === fTym1 ? fRes.skore1 : fRes.skore2) : undefined)
                : this.pendingCard('Vítěz SF 1'),
            fTym2
                ? this.teamCard(fTym2, 'SF', fRes?.vitez === fTym2 ? 'playoff-team-green' : 'playoff-team-blue', null, fRes ? (fRes.tym1 === fTym2 ? fRes.skore1 : fRes.skore2) : undefined)
                : this.pendingCard('Vítěz SF 2'),
            'Finále',
            fRes ? fRes.skore1 + ':' + fRes.skore2 : null,
            fRes
        );

        // Champion banner
        // Placement matches (O 5. místo / O 7. místo)
        // QF1 loser vs QF2 loser, QF3 loser vs QF4 loser – kolo "P5"
        const p5Porazeny1 = qfResults[0]?.porazeny || null;
        const p5Porazeny2 = qfResults[1]?.porazeny || null;
        const p5Porazeny3 = qfResults[2]?.porazeny || null;
        const p5Porazeny4 = qfResults[3]?.porazeny || null;

        const p5Res1 = (p5Porazeny1 && p5Porazeny2) ? this.findResult(res, 'P5', p5Porazeny1, p5Porazeny2) : null;
        const p5Res2 = (p5Porazeny3 && p5Porazeny4) ? this.findResult(res, 'P5', p5Porazeny3, p5Porazeny4) : null;

        const p5PlacementHtml = this._renderPlacementMatches(
            p5Porazeny1, p5Porazeny2, p5Res1,
            p5Porazeny3, p5Porazeny4, p5Res2
        );

        return '<div class="bracket-wrapper">' +
            '<div class="bracket-round bracket-round-qf">' +
                '<div class="bracket-round-title">Čtvrtfinále</div>' +
                '<div class="bracket-matches bracket-matches-4">' +
                    '<div class="bracket-match-slot">' + qfBoxes[0] + '</div>' +
                    '<div class="bracket-match-slot">' + qfBoxes[1] + '</div>' +
                    '<div class="bracket-match-slot">' + qfBoxes[2] + '</div>' +
                    '<div class="bracket-match-slot">' + qfBoxes[3] + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bracket-connector-col">' +
                '<svg class="bracket-lines" preserveAspectRatio="none"></svg>' +
            '</div>' +
            '<div class="bracket-round bracket-round-sf">' +
                '<div class="bracket-round-title">Semifinále</div>' +
                '<div class="bracket-matches bracket-matches-2">' +
                    '<div class="bracket-match-slot">' + sf1 + '</div>' +
                    '<div class="bracket-match-slot">' + sf2 + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bracket-connector-col">' +
                '<svg class="bracket-lines" preserveAspectRatio="none"></svg>' +
            '</div>' +
            '<div class="bracket-round bracket-round-f">' +
                '<div class="bracket-round-title">Finále</div>' +
                '<div class="bracket-matches bracket-matches-1">' +
                    '<div class="bracket-match-slot">' + final_ + '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        p5PlacementHtml +
        '<div class="playoff-legend" style="margin-top:12px">' +
            '<span class="playoff-legend-item"><span class="playoff-legend-dot playoff-legend-dot-east"></span> Východ</span>' +
            '<span class="playoff-legend-item"><span class="playoff-legend-dot playoff-legend-dot-west"></span> Západ</span>' +
        '</div>';
    },

    // Render placement matches section (5th/7th place)
    _renderPlacementMatches(t1A, t1B, res1, t2A, t2B, res2) {
        if (!t1A && !t1B && !t2A && !t2B) return '';

        const makeCard = (tym, result, isWinner) => {
            if (!tym) return this.pendingCard('Poražený z ČF');
            const cls = isWinner ? 'playoff-team-placement-5' : 'playoff-team-placement-7';
            const place = isWinner ? '5. místo' : '7. místo';
            const placeBadge = result?.vitez
                ? '<span class="playoff-placement-badge">' + place + '</span>'
                : '';
            return '<div class="playoff-team ' + cls + '">' +
                '<span class="playoff-seed">P</span>' +
                '<span class="playoff-team-name clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(tym) + '\')">' + Statistics.escapeHtml(tym) + '</span>' +
                (result ? '<span class="playoff-series-score">' + (result.tym1 === tym ? result.skore1 : result.skore2) + '</span>' : '') +
                placeBadge +
                '</div>';
        };

        const makeMatch = (tA, tB, res, label) => {
            const vitez = res?.vitez || null;
            const porazeny = res?.porazeny || null;
            const zzBadge = res?.zlatyZapas ? '<span class="playoff-zz-badge" title="Zlatý zápas">ZZ</span>' : '';
            const resultHtml = res
                ? '<div class="playoff-series-result">' + res.skore1 + ':' + res.skore2 + zzBadge + '</div>'
                : '';
            let onclickAttr = '';
            if (res && res.zapasy && res.zapasy.length > 0) {
                const key = res.kolo + '-' + [res.tym1, res.tym2].sort().join('-');
                this._matchDetails[key] = res;
                onclickAttr = ' onclick="Playoff.zobrazitDetail(\'' + Statistics.escapeAttr(key) + '\')" style="cursor:pointer"';
            }
            return '<div class="playoff-match playoff-match-placement"' + onclickAttr + '>' +
                '<div class="playoff-match-label">' + label + '</div>' +
                '<div class="playoff-match-teams">' +
                makeCard(tA, res, vitez === tA) +
                '<div class="playoff-vs">vs</div>' +
                makeCard(tB, res, vitez === tB) +
                '</div>' +
                resultHtml +
                (vitez ? '<div class="playoff-placement-result"><span class="placement-5">🥈 ' + Statistics.escapeHtml(vitez) + ' – 5. místo</span><span class="placement-7">  ' + Statistics.escapeHtml(porazeny) + ' – 7. místo</span></div>' : '') +
            '</div>';
        };

        const hasAny = t1A || t1B || t2A || t2B;
        if (!hasAny) return '';

        return '<div class="playoff-placement-section">' +
            '<div class="playoff-placement-title">Zápasy o umístění</div>' +
            '<div class="playoff-placement-matches">' +
                makeMatch(t1A, t1B, res1, 'O 5. místo – utkání 1') +
                makeMatch(t2A, t2B, res2, 'O 5. místo – utkání 2') +
            '</div>' +
        '</div>';
    },

    drawConnectors() {
        // Draw SVG connector lines between bracket rounds
        const wrapper = document.querySelector('.bracket-wrapper');
        if (!wrapper) return;

        // Small delay to ensure layout is computed
        requestAnimationFrame(() => {
            const connectorCols = wrapper.querySelectorAll('.bracket-connector-col');
            connectorCols.forEach(col => {
                const prevRound = col.previousElementSibling;
                const nextRound = col.nextElementSibling;
                if (!prevRound || !nextRound) return;

                const prevSlots = prevRound.querySelectorAll('.bracket-match-slot');
                const nextSlots = nextRound.querySelectorAll('.bracket-match-slot');
                if (prevSlots.length === 0 || nextSlots.length === 0) return;

                const colRect = col.getBoundingClientRect();
                const colW = colRect.width;
                const colH = colRect.height;

                if (colW === 0 || colH === 0) return;

                // Create SVG
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', colW);
                svg.setAttribute('height', colH);
                svg.style.position = 'absolute';
                svg.style.top = '0';
                svg.style.left = '0';
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.overflow = 'visible';

                const strokeColor = document.body.classList.contains('dark-mode') ? '#6b7280' : '#d1d5db';

                // For each next round slot, draw lines from its two source slots
                // Mapping: nextSlot[i] connects to prevSlot[2*i] and prevSlot[2*i+1]
                for (let i = 0; i < nextSlots.length; i++) {
                    const srcIdx1 = i * 2;
                    const srcIdx2 = i * 2 + 1;
                    if (srcIdx1 >= prevSlots.length) break;

                    const nextMatch = nextSlots[i].querySelector('.playoff-match');
                    const prevMatch1 = prevSlots[srcIdx1] ? prevSlots[srcIdx1].querySelector('.playoff-match') : null;
                    const prevMatch2 = prevSlots[srcIdx2] ? prevSlots[srcIdx2].querySelector('.playoff-match') : null;

                    if (!nextMatch || !prevMatch1) continue;

                    const nextCenter = this.getVerticalCenter(nextMatch, colRect);
                    const prev1Center = this.getVerticalCenter(prevMatch1, colRect);

                    // Draw line from prev1 to next
                    this.drawLine(svg, 0, prev1Center, colW / 2, prev1Center, strokeColor);
                    this.drawLine(svg, colW / 2, prev1Center, colW / 2, nextCenter, strokeColor);
                    this.drawLine(svg, colW / 2, nextCenter, colW, nextCenter, strokeColor);

                    if (prevMatch2) {
                        const prev2Center = this.getVerticalCenter(prevMatch2, colRect);
                        this.drawLine(svg, 0, prev2Center, colW / 2, prev2Center, strokeColor);
                        this.drawLine(svg, colW / 2, prev2Center, colW / 2, nextCenter, strokeColor);
                    }
                }

                // Replace old SVG content
                col.style.position = 'relative';
                const oldSvg = col.querySelector('svg.bracket-lines');
                if (oldSvg) oldSvg.remove();
                col.innerHTML = '';
                col.appendChild(svg);
            });
        });
    },

    getVerticalCenter(el, refRect) {
        const rect = el.getBoundingClientRect();
        return (rect.top + rect.height / 2) - refRect.top;
    },

    drawLine(svg, x1, y1, x2, y2, color) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        line.classList.add('bracket-line');
        svg.appendChild(line);
    }
};