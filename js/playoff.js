const Playoff = {
    _matchDetails: {},

    zobrazitDetail(key) {
        const result = this._matchDetails[key];
        if (result) Modals.zobrazitDetailUtkani(result);
    },

    render(aktualni_soutez) {
        const container = document.getElementById('playoffObsah');
        if (!container) return;

        const jePrvniLiga = aktualni_soutez.includes('prvni-liga');

        if (jePrvniLiga) {
            container.innerHTML = this.renderPrvniLigaBracket();
        } else {
            const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
            const tymy = this.seraditTymy(tabulkaData);
            const playoffResults = this.getPlayoffResults(aktualni_soutez);
            container.innerHTML = this.renderExtraligaBracket(tymy, tabulkaData, playoffResults);
        }
    },

    // Extract playoff results from match data, grouped by round and matchup
    getPlayoffResults(soutez) {
        const zapasy = Data.zapasy[soutez] || [];
        const results = {};

        zapasy.forEach(z => {
            if (!Statistics.isPlayoffKolo(z.kolo)) return;
            const kolo = z.kolo.replace(/\.$/, '').trim().toUpperCase();
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

        // Calculate series scores for each matchup
        Object.values(results).forEach(r => {
            let v1 = 0, v2 = 0;
            r.zapasy.forEach(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                if (v.domaci === 0 && v.hoste === 0) return; // neodehraný zápas
                const jeTym1Domaci = z.tymDomaci === r.tym1;
                if (jeTym1Domaci) {
                    if (v.domaci > v.hoste) v1++; else v2++;
                } else {
                    if (v.hoste > v.domaci) v1++; else v2++;
                }
            });
            r.skore1 = v1;
            r.skore2 = v2;
            r.vitez = v1 > v2 ? r.tym1 : (v2 > v1 ? r.tym2 : null);
        });

        return results;
    },

    // Get playoff results for 1. liga from the shared playoff pool
    getPlayoffResultsPrvniLiga() {
        const zapasy = Data.zapasy['prvni-liga-playoff'] || [];
        const results = {};

        zapasy.forEach(z => {
            const kolo = (z.kolo || 'QF').replace(/\.$/, '').trim().toUpperCase();
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

        Object.values(results).forEach(r => {
            let v1 = 0, v2 = 0;
            r.zapasy.forEach(z => {
                const v = Statistics.parseVysledek(z.vysledek);
                if (v.domaci === 0 && v.hoste === 0) return; // neodehraný zápas
                const jeTym1Domaci = z.tymDomaci === r.tym1;
                if (jeTym1Domaci) {
                    if (v.domaci > v.hoste) v1++; else v2++;
                } else {
                    if (v.hoste > v.domaci) v1++; else v2++;
                }
            });
            r.skore1 = v1;
            r.skore2 = v2;
            r.vitez = v1 > v2 ? r.tym1 : (v2 > v1 ? r.tym2 : null);
        });

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
        return '<div class="playoff-team ' + cls + '">' +
            '<span class="playoff-seed">' + seed + '</span>' +
            confBadge +
            '<span class="playoff-team-name clickable" onclick="Modals.zobrazitDetailTymu(\'' + Statistics.escapeAttr(name) + '\')">' + Statistics.escapeHtml(name) + '</span>' +
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
        const resultHtml = seriesResult
            ? '<div class="playoff-series-result">' + seriesResult + '</div>'
            : '';
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

    renderExtraligaBracket(tymy, data, playoffResults) {
        if (tymy.length < 6) {
            return '<p class="text-gray-500 text-center py-4">Nedostatek týmů pro zobrazení pavouka.</p>';
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

        const sfRes1 = sfTym1B ? this.findResult(res, 'SF', sfTym1A, sfTym1B) : null;
        const sfRes2 = sfTym2B ? this.findResult(res, 'SF', sfTym2A, sfTym2B) : null;
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

        // Champion banner
        const champion = fRes?.vitez || null;
        const championHtml = champion
            ? '<div class="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-center">' +
              '<div class="text-2xl">🏆</div>' +
              '<div class="font-bold text-lg text-yellow-800">Mistr: ' + Statistics.escapeHtml(champion) + '</div>' +
              '</div>'
            : '';

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
        championHtml +
        '<div class="playoff-legend mt-4">' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Přímý postup do Final Four (1.–2.)</span>' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm ml-4"><span class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> Čtvrtfinále (3.–6.)</span>' +
        '</div>' +
        '<p class="text-xs text-gray-500 mt-2">* Pavouk je vytvořen na základě aktuálního pořadí v tabulce základní části. V semifinále hraje 1. tým proti níže nasazenému postupujícímu z ČF a 2. tým proti výše nasazenému. Výsledky se doplňují automaticky z dat play-off (kolo: QF/SF/F).</p>';
    },

    renderPrvniLigaBracket() {
        const tabulkaVychod = Statistics.vypocitejTabulku('prvni-liga-vychod');
        const tabulkaZapad = Statistics.vypocitejTabulku('prvni-liga-zapad');

        const tymyV = this.seraditTymy(tabulkaVychod);
        const tymyZ = this.seraditTymy(tabulkaZapad);

        if (tymyV.length < 4 || tymyZ.length < 4) {
            return '<p class="text-gray-500 text-center py-4">Nedostatek týmů pro zobrazení pavouka.</p>';
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
        const champion = fRes?.vitez || null;
        const championHtml = champion
            ? '<div class="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-center">' +
              '<div class="text-2xl">🏆</div>' +
              '<div class="font-bold text-lg text-yellow-800">Mistr: ' + Statistics.escapeHtml(champion) + '</div>' +
              '</div>'
            : '';

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
        championHtml +
        '<div class="playoff-legend mt-4">' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm"><span class="w-3 h-3 rounded-sm border" style="background:#fef3c7;border-color:#fbbf24;width:12px;height:12px"></span> Východ</span>' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm ml-3"><span class="w-3 h-3 rounded-sm border" style="background:#dbeafe;border-color:#60a5fa;width:12px;height:12px"></span> Západ</span>' +
        '</div>' +
        '<p class="text-xs text-gray-500 mt-2">* Pavouk je vytvořen na základě aktuálního pořadí v tabulkách základní části obou skupin. Výsledky play-off se zapisují do klíče "prvni-liga-playoff" v JSON s kolo: QF/SF/F.</p>';
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