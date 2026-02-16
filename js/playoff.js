const Playoff = {
    render(aktualni_soutez) {
        const container = document.getElementById('playoffObsah');
        if (!container) return;

        const jePrvniLiga = aktualni_soutez.includes('prvni-liga');

        if (jePrvniLiga) {
            container.innerHTML = this.renderPrvniLigaBracket();
        } else {
            const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
            const tymy = this.seraditTymy(tabulkaData);
            container.innerHTML = this.renderExtraligaBracket(tymy, tabulkaData);
        }
    },

    seraditTymy(tabulkaData) {
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
        return tymy;
    },

    teamCard(name, seed, highlight, conference) {
        const cls = highlight || '';
        const confBadge = conference
            ? '<span class="playoff-conf-badge playoff-conf-' + conference + '">' + (conference === 'V' ? 'V' : 'Z') + '</span>'
            : '';
        return '<div class="playoff-team ' + cls + '">' +
            '<span class="playoff-seed">' + seed + '</span>' +
            confBadge +
            '<span class="playoff-team-name clickable" onclick="Modals.zobrazitDetailTymu(\'' + name.replace(/'/g, "\\'") + '\')">' + name + '</span>' +
            '</div>';
    },

    pendingCard(label) {
        return '<div class="playoff-team playoff-team-pending">' +
            '<span class="playoff-seed">?</span>' +
            '<span class="playoff-team-name">' + label + '</span>' +
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

        const sf1 = this.matchBox(
            this.teamCard(t(0), '1.', 'playoff-team-green'),
            this.pendingCard('Vítěz ČF 1'),
            'Semifinále 1'
        );
        const sf2 = this.matchBox(
            this.teamCard(t(1), '2.', 'playoff-team-green'),
            this.pendingCard('Vítěz ČF 2'),
            'Semifinále 2'
        );

        const final_ = this.matchBox(
            this.pendingCard('Vítěz SF 1'),
            this.pendingCard('Vítěz SF 2'),
            'Finále (Final Four)'
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
        '<div class="playoff-legend mt-4">' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Přímý postup do Final Four (1.–2.)</span>' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm ml-4"><span class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> Čtvrtfinále (3.–6.)</span>' +
        '</div>' +
        '<p class="text-xs text-gray-500 mt-2">* Pavouk je vytvořen na základě aktuálního pořadí v tabulce základní části.</p>';
    },

    renderPrvniLigaBracket() {
        const tabulkaVychod = Statistics.vypocitejTabulku('prvni-liga-vychod');
        const tabulkaZapad = Statistics.vypocitejTabulku('prvni-liga-zapad');

        const tymyV = this.seraditTymy(tabulkaVychod);
        const tymyZ = this.seraditTymy(tabulkaZapad);

        if (tymyV.length < 4 || tymyZ.length < 4) {
            return '<p class="text-gray-500 text-center py-4">Nedostatek týmů pro zobrazení pavouka.</p>';
        }

        // Čtvrtfinále: crossover East vs West
        // 1.V vs 4.Z, 3.V vs 2.Z, 2.V vs 3.Z, 4.V vs 1.Z
        const qf1 = this.matchBox(
            this.teamCard(tymyV[0], '1.', 'playoff-team-east', 'V'),
            this.teamCard(tymyZ[3], '4.', 'playoff-team-west', 'Z'),
            'Čtvrtfinále 1'
        );
        const qf2 = this.matchBox(
            this.teamCard(tymyV[2], '3.', 'playoff-team-east', 'V'),
            this.teamCard(tymyZ[1], '2.', 'playoff-team-west', 'Z'),
            'Čtvrtfinále 2'
        );
        const qf3 = this.matchBox(
            this.teamCard(tymyV[1], '2.', 'playoff-team-east', 'V'),
            this.teamCard(tymyZ[2], '3.', 'playoff-team-west', 'Z'),
            'Čtvrtfinále 3'
        );
        const qf4 = this.matchBox(
            this.teamCard(tymyV[3], '4.', 'playoff-team-east', 'V'),
            this.teamCard(tymyZ[0], '1.', 'playoff-team-west', 'Z'),
            'Čtvrtfinále 4'
        );

        // Semifinále: winners cross
        const sf1 = this.matchBox(
            this.pendingCard('Vítěz ČF 1'),
            this.pendingCard('Vítěz ČF 2'),
            'Semifinále 1'
        );
        const sf2 = this.matchBox(
            this.pendingCard('Vítěz ČF 3'),
            this.pendingCard('Vítěz ČF 4'),
            'Semifinále 2'
        );

        // Finále
        const final_ = this.matchBox(
            this.pendingCard('Vítěz SF 1'),
            this.pendingCard('Vítěz SF 2'),
            'Finále'
        );

        return '<div class="bracket-wrapper">' +
            '<div class="bracket-round bracket-round-qf">' +
                '<div class="bracket-round-title">Čtvrtfinále</div>' +
                '<div class="bracket-matches bracket-matches-4">' +
                    '<div class="bracket-match-slot">' + qf1 + '</div>' +
                    '<div class="bracket-match-slot">' + qf2 + '</div>' +
                    '<div class="bracket-match-slot">' + qf3 + '</div>' +
                    '<div class="bracket-match-slot">' + qf4 + '</div>' +
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
        '<div class="playoff-legend mt-4">' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm"><span class="w-3 h-3 rounded-sm border" style="background:#fef3c7;border-color:#fbbf24;width:12px;height:12px"></span> Východ</span>' +
            '<span class="inline-flex items-center gap-1 text-xs md:text-sm ml-3"><span class="w-3 h-3 rounded-sm border" style="background:#dbeafe;border-color:#60a5fa;width:12px;height:12px"></span> Západ</span>' +
        '</div>' +
        '<p class="text-xs text-gray-500 mt-2">* Pavouk je vytvořen na základě aktuálního pořadí v tabulkách základní části obou skupin. Play-off 1. ligy je jednotné – týmy Východu hrají křížem proti týmům Západu.</p>';
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