const Playoff = {
    render(aktualni_soutez) {
        const container = document.getElementById('playoffObsah');
        if (!container) return;

        const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
        const tymy = Object.keys(tabulkaData);

        tymy.sort((a, b) => {
            const tA = tabulkaData[a];
            const tB = tabulkaData[b];
            if (tB.body !== tA.body) return tB.body - tA.body;
            if (tB.vyhry !== tA.vyhry) return tB.vyhry - tA.vyhry;
            const rozdilZapasyA = tA.zapasyV - tA.zapasyP;
            const rozdilZapasyB = tB.zapasyV - tB.zapasyP;
            if (rozdilZapasyB !== rozdilZapasyA) return rozdilZapasyB - rozdilZapasyA;
            const rozdilSetyA = tA.setyV - tA.setyP;
            const rozdilSetyB = tB.setyV - tB.setyP;
            if (rozdilSetyB !== rozdilSetyA) return rozdilSetyB - rozdilSetyA;
            const rozdilBodyA = tA.bodyV - tA.bodyP;
            const rozdilBodyB = tB.bodyV - tB.bodyP;
            return rozdilBodyB - rozdilBodyA;
        });

        const jePrvniLiga = aktualni_soutez.includes('prvni-liga');

        if (jePrvniLiga) {
            container.innerHTML = this.renderPrvniLigaBracket(tymy, tabulkaData);
        } else {
            container.innerHTML = this.renderExtraligaBracket(tymy, tabulkaData);
        }
    },

    teamCard(name, seed, highlight) {
        const cls = highlight || '';
        return '<div class="playoff-team ' + cls + '">' +
            '<span class="playoff-seed">' + seed + '</span>' +
            '<span class="playoff-team-name clickable" onclick="Modals.zobrazitDetailTymu(\'' + name + '\')">' + name + '</span>' +
            '</div>';
    },

    matchBox(team1Html, team2Html, label) {
        return '<div class="playoff-match">' +
            (label ? '<div class="playoff-match-label">' + label + '</div>' : '') +
            '<div class="playoff-match-teams">' +
            team1Html +
            '<div class="playoff-vs">vs</div>' +
            team2Html +
            '</div></div>';
    },

    renderExtraligaBracket(tymy, data) {
        if (tymy.length < 6) {
            return '<p class="text-gray-500 text-center py-4">Nedostatek týmů pro zobrazení pavouka.</p>';
        }

        const t = (i) => tymy[i] || '?';

        // Quarterfinals: 3 vs 6, 4 vs 5
        const qf1 = this.matchBox(
            this.teamCard(t(2), '3.', 'playoff-team-blue'),
            this.teamCard(t(5), '6.', 'playoff-team-blue'),
            'Čtvrtfinále 1'
        );
        const qf2 = this.matchBox(
            this.teamCard(t(3), '4.', 'playoff-team-blue'),
            this.teamCard(t(4), '5.', 'playoff-team-blue'),
            'Čtvrtfinále 2'
        );

        // Semifinals: 1 vs winner QF1, 2 vs winner QF2
        const sf1 = this.matchBox(
            this.teamCard(t(0), '1.', 'playoff-team-green'),
            '<div class="playoff-team playoff-team-pending"><span class="playoff-seed">?</span><span class="playoff-team-name">Vítěz ČF 1</span></div>',
            'Semifinále 1'
        );
        const sf2 = this.matchBox(
            this.teamCard(t(1), '2.', 'playoff-team-green'),
            '<div class="playoff-team playoff-team-pending"><span class="playoff-seed">?</span><span class="playoff-team-name">Vítěz ČF 2</span></div>',
            'Semifinále 2'
        );

        // Final
        const final_ = this.matchBox(
            '<div class="playoff-team playoff-team-pending"><span class="playoff-seed">?</span><span class="playoff-team-name">Vítěz SF 1</span></div>',
            '<div class="playoff-team playoff-team-pending"><span class="playoff-seed">?</span><span class="playoff-team-name">Vítěz SF 2</span></div>',
            'Finále (Final Four)'
        );

        return '<div class="playoff-bracket playoff-bracket-extraliga">' +
            '<div class="playoff-round">' +
                '<div class="playoff-round-title">Čtvrtfinále</div>' +
                qf1 + qf2 +
            '</div>' +
            '<div class="playoff-connector-col"><div class="playoff-arrow">→</div><div class="playoff-arrow">→</div></div>' +
            '<div class="playoff-round">' +
                '<div class="playoff-round-title">Semifinále (Final Four)</div>' +
                sf1 + sf2 +
            '</div>' +
            '<div class="playoff-connector-col"><div class="playoff-arrow">→</div></div>' +
            '<div class="playoff-round">' +
                '<div class="playoff-round-title">Finále</div>' +
                final_ +
            '</div>' +
        '</div>' +
        '<div class="playoff-legend mt-4">' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Přímý postup do Final Four (1.–2.)</span>' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm ml-4"><span class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> Čtvrtfinále (3.–6.)</span>' +
        '</div>' +
        '<p class="text-xs text-gray-500 mt-2">* Pavouk je vytvořen na základě aktuálního pořadí v tabulce základní části.</p>';
    },

    renderPrvniLigaBracket(tymy, data) {
        if (tymy.length < 4) {
            return '<p class="text-gray-500 text-center py-4">Nedostatek týmů pro zobrazení pavouka.</p>';
        }

        const t = (i) => tymy[i] || '?';

        // Semifinals: 1 vs 4, 2 vs 3
        const sf1 = this.matchBox(
            this.teamCard(t(0), '1.', 'playoff-team-green'),
            this.teamCard(t(3), '4.', 'playoff-team-green'),
            'Semifinále 1'
        );
        const sf2 = this.matchBox(
            this.teamCard(t(1), '2.', 'playoff-team-green'),
            this.teamCard(t(2), '3.', 'playoff-team-green'),
            'Semifinále 2'
        );

        // Final
        const final_ = this.matchBox(
            '<div class="playoff-team playoff-team-pending"><span class="playoff-seed">?</span><span class="playoff-team-name">Vítěz SF 1</span></div>',
            '<div class="playoff-team playoff-team-pending"><span class="playoff-seed">?</span><span class="playoff-team-name">Vítěz SF 2</span></div>',
            'Finále'
        );

        return '<div class="playoff-bracket">' +
            '<div class="playoff-round">' +
                '<div class="playoff-round-title">Semifinále</div>' +
                sf1 + sf2 +
            '</div>' +
            '<div class="playoff-connector-col"><div class="playoff-arrow">→</div></div>' +
            '<div class="playoff-round">' +
                '<div class="playoff-round-title">Finále</div>' +
                final_ +
            '</div>' +
        '</div>' +
        '<div class="playoff-legend mt-4">' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Play-off (1.–4.)</span>' +
        '</div>' +
        '<p class="text-xs text-gray-500 mt-2">* Pavouk je vytvořen na základě aktuálního pořadí v tabulce základní části.</p>';
    }
};