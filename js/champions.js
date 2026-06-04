const Champions = {
    _deriveAktualniVitez() {
        if (!Data.rocnik) return null;
        const results = Playoff.getPlayoffResults('extraliga');
        const finale = Object.values(results).find(r => r.kolo === 'F');
        if (!finale || !finale.vitez) return null;
        return { sezona: Data.rocnik, tym: finale.vitez };
    },

    render() {
        const container = document.getElementById('vitezoveObsah');
        if (!container) return;

        const vitezove = Data.vitezove;
        if (!vitezove || vitezove.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Zatím žádní vítězové.</p>';
            return;
        }

        // Sort by season descending (newest first)
        const sorted = [...vitezove].sort((a, b) => {
            const rokA = parseInt(a.sezona) || 0;
            const rokB = parseInt(b.sezona) || 0;
            return rokB - rokA;
        });

        // Prepend current season champion if final is played and not yet archived
        const aktualni = this._deriveAktualniVitez();
        if (aktualni && !sorted.some(v => v.sezona === aktualni.sezona)) {
            sorted.unshift(aktualni);
        }

        // Count titles per team
        const tituly = {};
        sorted.forEach(v => {
            tituly[v.tym] = (tituly[v.tym] || 0) + 1;
        });

        // Most successful teams (sorted by titles desc)
        const topTymy = Object.entries(tituly)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Top teams summary
        const topHtml = topTymy.map((t, i) => {
            const medalColors = [
                'bg-yellow-100 border-yellow-400 text-yellow-800',
                'bg-gray-100 border-gray-400 text-gray-700',
                'bg-orange-100 border-orange-400 text-orange-800',
                'bg-blue-50 border-blue-300 text-blue-700',
                'bg-blue-50 border-blue-300 text-blue-700'
            ];
            return '<div class="inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs md:text-sm font-semibold ' + medalColors[i] + '">' +
                '<span>' + Statistics.escapeHtml(t[0]) + '</span>' +
                '<span class="font-bold">' + t[1] + 'x</span>' +
                '</div>';
        }).join(' ');

        const historickeRocniky = new Set(Data.getHistorickeRocniky());

        // Timeline of champions
        const timelineHtml = sorted.map((v, i) => {
            const highlightClass = i === 0 ? 'champions-entry-current' : '';
            const rocnikKlic = v.sezona.replace('/', '-');
            const rocnikKlicAlt = v.sezona.replace('-', '/');
            const historickyKlic = historickeRocniky.has(rocnikKlic) ? rocnikKlic
                : historickeRocniky.has(rocnikKlicAlt) ? rocnikKlicAlt
                : null;

            const seasonHtml = historickyKlic
                ? '<span class="champions-season champions-season-link" onclick="App.zmenitRocnik(\'' + Statistics.escapeAttr(historickyKlic) + '\')" style="cursor:pointer">' + Statistics.escapeHtml(v.sezona) + '</span>'
                : '<div class="champions-season">' + Statistics.escapeHtml(v.sezona) + '</div>';
            return '<div class="champions-entry ' + highlightClass + '">' +
                seasonHtml +
                '<div class="champions-team">' + Statistics.escapeHtml(v.tym) + '</div>' +
                '</div>';
        }).join('');

        container.innerHTML =
            '<div class="mb-4">' +
                '<div class="text-sm font-semibold text-gray-600 mb-2">Nejúspěšnější týmy:</div>' +
                '<div class="flex flex-wrap gap-2">' + topHtml + '</div>' +
            '</div>' +
            '<div class="champions-timeline">' + timelineHtml + '</div>';
    }
};