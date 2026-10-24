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

    // Ligová tabulka v jednotném designu webu (css/standings.css). Kreslí ji
    // hlavní web i embed tabulka.html.
    //   opts.containerId  - kam vykreslit (výchozí 'tabulkaObsah')
    //   opts.naDetail     - funkce(tym) pro odkaz "Detail týmu" v rozbaleném řádku
    //   opts.animace      - přehrát přesun týmů po novém kole (výchozí true)
    render(aktualni_soutez, opts = {}) {
        const container = document.getElementById(opts.containerId || 'tabulkaObsah');
        if (!container) return;
        const tabulkaData = Statistics.vypocitejTabulku(aktualni_soutez);
        const tymy = Statistics.seraditTymyPodleTabulky(tabulkaData);
        const konfig = Data.getKonfigurace(App.aktualni_rocnik);
        const bodovani = (konfig.bodovani && konfig.bodovani[aktualni_soutez]) || Statistics._FALLBACK_BODOVANI.extraliga;
        const jePrvniLiga = bodovani.remizaMozna;
        const zonyConfig = (konfig.zony && konfig.zony[aktualni_soutez]) || [];
        const zony = this.vypocitejZony(tymy.length, zonyConfig);
        const zmeny = Statistics.vypocitejZmenyPozic(aktualni_soutez);
        const esc = (x) => Statistics.escapeHtml(x);
        const attr = (x) => Statistics.escapeAttr(x);
        // Oddělovače a rozbalené řádky jdou přes celou šířku (colspan větší než
        // počet sloupců); červený pruh bodů v nich dokreslí CSS pozadí s pevnou
        // šířkou sloupce - funguje i na mobilu, kde se část sloupců skrývá.
        const colspan = 99;

        const rows = [];
        tymy.forEach((tym, idx) => {
            const t = tabulkaData[tym];
            const z = zony[idx];
            const delta = zmeny[tym] || 0;
            const deltaHtml = delta > 0 ? '<span class="lt-delta up" title="Posun o ' + delta + ' nahoru">▲' + delta + '</span>'
                : delta < 0 ? '<span class="lt-delta down" title="Posun o ' + (-delta) + ' dolů">▼' + (-delta) + '</span>' : '';
            const formaHtml = this.formaHtml(Statistics.vypocitejFormuTymu(tym, aktualni_soutez));

            rows.push(
                '<tr class="lt-row" data-i="' + idx + '" data-tym="' + attr(tym) + '" tabindex="0" aria-expanded="false">' +
                '<td class="lt-pos lt-z-' + (z.typ || 'none') + '"><span class="lt-posnum">' + (idx + 1) + '</span>' + deltaHtml + '</td>' +
                '<td class="lt-l"><div class="lt-team">' + this.logoHtml(tym) +
                    '<span class="lt-name"><span class="lt-name-full">' + esc(tym) + '</span><span class="lt-name-short">' + esc(Statistics.zkracenyNazev(tym)) + '</span></span></div></td>' +
                '<td>' + t.utkani + '</td><td>' + t.vyhry + '</td>' +
                (jePrvniLiga ? '<td>' + t.remizy + '</td>' : '') +
                '<td>' + t.prohry + '</td>' +
                '<td class="lt-col-wide">' + t.zapasyV + ':' + t.zapasyP + '</td>' +
                '<td class="lt-col-wide">' + this.rozdilHtml(t.setyV, t.setyP) + '</td>' +
                '<td class="lt-col-wide">' + this.rozdilHtml(t.bodyV, t.bodyP) + '</td>' +
                '<td class="lt-col-wide">' + formaHtml + '</td>' +
                '<td class="lt-pts" data-body="' + t.body + '">' + t.body + '</td>' +
                '</tr>'
            );

            const utkani = Statistics.utkaniTymu(tym, aktualni_soutez).slice(0, 4);
            const vysledky = utkani.map(u => {
                const [, m, d] = (u.datum || '').split('-').map(Number);
                return '<tr><td class="lt-kolo">' + esc(u.kolo) + ' kolo</td><td class="lt-misto">' + (u.doma ? 'doma' : 'venku') + '</td>' +
                    '<td class="lt-souper">' + this.logoHtml(u.souper) + '<span>' + esc(u.souper) + '</span>' +
                        (u.neschvaleno ? '<span class="lt-pending" title="Čeká na schválení svazem">neschváleno</span>' : '') + '</td>' +
                    '<td class="lt-kolo lt-datum">' + (d ? d + '. ' + m + '.' : '') + '</td>' +
                    '<td class="lt-skore ' + u.vysledek + '">' + u.nase + ':' + u.jejich + '</td></tr>';
            }).join('');
            rows.push(
                '<tr class="lt-detail" data-for="' + idx + '"><td colspan="' + colspan + '"><div class="lt-collapse"><div class="lt-collapse-in"><div class="lt-collapse-pad">' +
                '<div class="lt-mobile-extra"><span>Sety<b>' + t.setyV + ':' + t.setyP + '</b></span><span>Míče<b>' + t.bodyV + ':' + t.bodyP + '</b></span><span>' + formaHtml + '</span></div>' +
                (vysledky ? '<table class="lt-results">' + vysledky + '</table>' : '<div class="lt-empty-results">Zatím bez odehraného utkání.</div>') +
                (opts.naDetail ? '<div class="lt-detail-link"><button type="button" data-detail="' + attr(tym) + '">Detail týmu a soupiska</button></div>' : '') +
                '</div></div></div></td></tr>'
            );

            if (z.dividerAfter !== null && z.dividerAfter !== undefined && (!z.dividerMinTeams || tymy.length > z.dividerMinTeams - 1)) {
                const cls = (z.dividerClass || '').includes('relegation') ? 'relegation' : 'playoff';
                const label = String(z.dividerAfter || '').replace('↓', '').trim();
                rows.push('<tr class="lt-divider ' + cls + '"><td colspan="' + colspan + '">' + esc(label) + '</td></tr>');
            }
        });

        const barvyZon = { 'final-four': 'var(--zone-top)', top: 'var(--zone-top)', playoff: 'var(--zone-playoff)', relegation: 'var(--zone-relegation)' };
        const legenda = zonyConfig.filter(z => z.legenda)
            .map(z => '<span><i style="background:' + (barvyZon[z.typ] || 'var(--border)') + '"></i>' + esc(z.legenda) + '</span>').join('');
        const bodovaniInfo = (konfig.bodovaniInfo && konfig.bodovaniInfo[aktualni_soutez]) || '';

        container.innerHTML =
            '<div class="overflow-x-auto"><table class="lt-table">' +
            '<thead><tr>' +
            '<th class="lt-pos"><span class="sr-only">Pořadí</span></th><th class="lt-l">Tým</th>' +
            '<th title="Utkání">U</th><th title="Výhry">V</th>' + (jePrvniLiga ? '<th title="Remízy">R</th>' : '') + '<th title="Prohry">P</th>' +
            '<th class="lt-col-wide" title="Poměr dílčích zápasů">Zápasy</th><th class="lt-col-wide" title="Rozdíl setů">Sety</th>' +
            '<th class="lt-col-wide" title="Rozdíl míčů">Míče</th><th class="lt-col-wide" title="Posledních 5 utkání">Forma</th>' +
            '<th class="lt-pts">Body</th>' +
            '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
            '<div class="lt-foot">' + legenda +
            (Object.keys(zmeny).length ? '<span><b style="color:var(--win)">▲</b> <b style="color:var(--loss)">▼</b> posun oproti minulému kolu</span>' : '') +
            (bodovaniInfo ? '<span class="lt-bod">' + bodovaniInfo + '</span>' : '') +
            (Statistics.maNeschvalene(aktualni_soutez) ? '<span class="lt-note">Zahrnuje i výsledky, které ještě čekají na schválení svazem.</span>' : '') +
            '</div>';

        const table = container.querySelector('.lt-table');
        container.querySelectorAll('.lt-row').forEach(r => {
            r.addEventListener('click', () => this._toggle(table, r.dataset.i));
            r.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggle(table, r.dataset.i); }
            });
        });
        if (opts.naDetail) {
            container.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', (e) => {
                e.stopPropagation();
                opts.naDetail(b.dataset.detail);
            }));
        }
        if (opts.animace !== false) this.animujPoradi(table, aktualni_soutez);
    },

    _toggle(table, i) {
        const det = table.querySelector('.lt-detail[data-for="' + i + '"] .lt-collapse');
        const row = table.querySelector('.lt-row[data-i="' + i + '"]');
        if (!det || !row) return;
        const open = !det.classList.contains('open');
        det.classList.toggle('open', open);
        row.classList.toggle('open', open);
        row.setAttribute('aria-expanded', String(open));
    },

    logoHtml(tym) {
        const url = Data.tymLoga && Data.tymLoga[tym];
        if (url) return '<span class="lt-logo"><img src="' + Statistics.escapeAttr(url) + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'lt-logo-empty\');this.remove()"></span>';
        const zkratka = String(tym).split(/\s+/).filter(w => !['sk', 'bk', 'tj', 'ba', 'bac', 'skb', 'skp'].includes(w.toLowerCase())).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
        return '<span class="lt-logo lt-logo-empty">' + Statistics.escapeHtml(zkratka || '?') + '</span>';
    },

    // forma = pole 'w'/'l'/'d' (nejstarší první); doplní se šedými na `pocet`
    formaHtml(forma, pocet = 5) {
        const f = [...(forma || [])];
        while (f.length < pocet) f.unshift('e');
        const pismeno = { w: 'V', l: 'P', d: 'R', e: '' };
        const popis = { w: 'výhra', l: 'prohra', d: 'remíza', e: '' };
        return '<span class="lt-form">' + f.map(x => '<span class="' + x + '"' + (popis[x] ? ' title="' + popis[x] + '"' : '') + '>' + pismeno[x] + '</span>').join('') + '</span>';
    },

    rozdilHtml(a, b) {
        const d = a - b;
        return '<span class="lt-pm ' + (d > 0 ? 'plus' : d < 0 ? 'minus' : '') + '">' + (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d) + '</span>' +
            '<span class="lt-ratio">' + a + ':' + b + '</span>';
    },

    // Jediná "velká" animace webu: po novém kole se týmy přesunou z pořadí po
    // předchozím kole na aktuální místa a body se dopočítají. Pro každého
    // návštěvníka jen jednou na kolo, respektuje omezení pohybu.
    animujPoradi(table, soutez) {
        if (!table || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const kola = (Data.zapasy[soutez] || []).map(z => parseInt(z.kolo)).filter(k => !isNaN(k));
        if (kola.length === 0) return;
        const maxKolo = Math.max(...kola);
        if (maxKolo <= 1) return;
        const klic = 'lt-anim:' + soutez + ':' + (App.aktualni_rocnik || Data.rocnik || '') + ':' + maxKolo;
        try {
            if (localStorage.getItem(klic)) return;
            localStorage.setItem(klic, '1');
        } catch (e) { return; }

        const prevTab = Statistics.vypocitejTabulku(soutez, maxKolo - 1);
        const prevOrder = Statistics.seraditTymyPodleTabulky(prevTab);
        const rows = [...table.querySelectorAll('.lt-row')];
        const slotTop = rows.map(r => r.getBoundingClientRect().top);
        const prevBody = (tym) => (prevTab[tym] ? prevTab[tym].body : 0);

        table.classList.add('intro');
        rows.forEach((r, i) => {
            const prevIdx = prevOrder.indexOf(r.dataset.tym);
            const dy = prevIdx >= 0 ? slotTop[prevIdx] - slotTop[i] : 0;
            r.style.transition = 'none';
            r.style.transform = 'translateY(' + dy + 'px)';
            if (dy) r.classList.add('moving');
            r.querySelector('.lt-pts').textContent = prevBody(r.dataset.tym);
            r.querySelector('.lt-posnum').textContent = prevIdx >= 0 ? prevIdx + 1 : i + 1;
        });
        void table.offsetHeight;

        setTimeout(() => {
            const dur = 900;
            rows.forEach(r => {
                r.style.transition = 'transform ' + dur + 'ms cubic-bezier(.65,0,.35,1)';
                r.style.transform = '';
            });
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min(1, (now - start) / dur);
                rows.forEach(r => {
                    const pts = r.querySelector('.lt-pts');
                    const from = prevBody(r.dataset.tym);
                    pts.textContent = Math.round(from + (Number(pts.dataset.body) - from) * p);
                });
                if (p < 1) { requestAnimationFrame(tick); return; }
                rows.forEach((r, i) => {
                    r.classList.remove('moving');
                    r.style.transition = '';
                    r.querySelector('.lt-posnum').textContent = i + 1;
                });
                table.classList.remove('intro');
            };
            requestAnimationFrame(tick);
        }, 400);
    }
};
