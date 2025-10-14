const Players = {
    renderTop3(aktualni_soutez, vybrana_kola) {
        const stats = Statistics.vypocitejStatistiky(aktualni_soutez, vybrana_kola);
        const hraciList = Object.keys(stats).filter(h => stats[h].zapasy >= 5);
        
        hraciList.sort((a, b) => {
            const winRateA = stats[a].zapasy > 0 ? (stats[a].vyhry / stats[a].zapasy) : 0;
            const winRateB = stats[b].zapasy > 0 ? (stats[b].vyhry / stats[b].zapasy) : 0;
            return winRateB - winRateA;
        });
        
        const top3 = hraciList.slice(0, 3);
        const container = document.getElementById('hracMesiceObsah');
        
        if (top3.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Nedostatek dat</p>';
            return;
        }
        
        const html = top3.map((hrac, idx) => {
            const s = stats[hrac];
            const winRate = ((s.vyhry / s.zapasy) * 100).toFixed(1);
            const medals = ['🥇', '🥈', '🥉'];
            const colors = ['bg-yellow-100 border-yellow-400', 'bg-gray-100 border-gray-400', 'bg-orange-100 border-orange-400'];
            
            return '<div class="border-2 ' + colors[idx] + ' rounded-lg p-4 text-center cursor-pointer hover:shadow-lg transition-all" onclick="Modals.zobrazitDetailHrace(\'' + hrac + '\')"><div class="text-3xl md:text-4xl mb-2">' + medals[idx] + '</div><div class="font-bold text-base md:text-lg text-gray-800 mb-1">' + hrac + '</div><div class="text-xl md:text-2xl font-bold text-blue-600 mb-1">' + winRate + '%</div><div class="text-xs md:text-sm text-gray-600">' + s.vyhry + 'V / ' + s.prohry + 'P (' + s.zapasy + ' zápasů)</div></div>';
        }).join('');
        
        container.innerHTML = html;
    },

    renderStatistiky(aktualni_soutez, vybrana_kola) {
        const stats = Statistics.vypocitejStatistiky(aktualni_soutez, vybrana_kola);
        let hraciList = Object.keys(stats);
        
        const hledatText = document.getElementById('hledatHrace')?.value.toLowerCase() || '';
        const minZapasy = parseInt(document.getElementById('minZapasy')?.value) || 0;
        const razeniSloupec = document.getElementById('razeniSloupec')?.value || 'winrate';
        
        if (hledatText) hraciList = hraciList.filter(hrac => hrac.toLowerCase().includes(hledatText));
        if (minZapasy > 0) hraciList = hraciList.filter(hrac => stats[hrac].zapasy >= minZapasy);
        
        hraciList.sort((a, b) => {
            const sA = stats[a];
            const sB = stats[b];
            switch(razeniSloupec) {
                case 'winrate':
                    const winRateA = sA.zapasy > 0 ? (sA.vyhry / sA.zapasy) : 0;
                    const winRateB = sB.zapasy > 0 ? (sB.vyhry / sB.zapasy) : 0;
                    if (Math.abs(winRateA - winRateB) < 0.001) return sB.zapasy - sA.zapasy;
                    return winRateB - winRateA;
                case 'zapasy':
                    return sB.zapasy - sA.zapasy;
                case 'vyhry':
                    return sB.vyhry - sA.vyhry;
                case 'jmeno':
                    return a.localeCompare(b, 'cs');
                default:
                    return 0;
            }
        });
        
        const rows = hraciList.map((hrac, idx) => {
            const s = stats[hrac];
            const winRatio = s.zapasy > 0 ? ((s.vyhry / s.zapasy) * 100).toFixed(1) : '0.0';
            const nejTym = Object.keys(s.tymy).length > 0 ? Object.entries(s.tymy).sort((a, b) => b[1] - a[1])[0][0] : '-';
            const winColor = parseFloat(winRatio) >= 50 ? 'text-green-600' : 'text-red-600';
            const forma = Statistics.getForma(hrac, Data.zapasy[aktualni_soutez]);
            const formaHtml = forma.split('').map(v => '<span class="inline-block w-5 h-5 leading-5 text-center rounded font-bold text-xs ' + (v === 'V' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') + '">' + v + '</span>').join(' ');
            
            return '<tr class="border-b border-gray-200 hover:bg-blue-50"><td class="p-2 text-center font-bold text-gray-500">' + (idx + 1) + '</td><td class="p-2 font-semibold clickable" onclick="Modals.zobrazitDetailHrace(\'' + hrac + '\')">' + hrac + '</td><td class="p-2 text-blue-600 clickable" onclick="Modals.zobrazitDetailTymu(\'' + nejTym + '\')">' + nejTym + '</td><td class="p-2 text-center">' + s.zapasy + '</td><td class="p-2 text-center text-green-600 font-semibold">' + s.vyhry + '</td><td class="p-2 text-center text-red-600 font-semibold">' + s.prohry + '</td><td class="p-2 text-center font-bold ' + winColor + '">' + winRatio + '%</td><td class="p-2 text-center">' + (formaHtml || '-') + '</td></tr>';
        }).join('');
        
        const filtryHtml = '<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 mb-4"><h3 class="text-xs md:text-sm font-semibold text-gray-700 mb-3">🔍 Filtry</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3"><div><label class="block text-xs font-medium text-gray-600 mb-1">Hráč</label><input type="text" id="hledatHrace" placeholder="Jméno..." class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" oninput="App.zobrazitData()"></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Tým</label><select id="filtrTym" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" onchange="App.zobrazitData()"><option value="">Všechny týmy</option></select></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Disciplína</label><select id="filtrDisciplina" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" onchange="App.zobrazitData()"><option value="">Vše</option><option value="dvouhra">Dvouhry</option><option value="ctyrhra">Čtyřhry</option></select></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Min. zápasů</label><input type="number" id="minZapasy" value="0" min="0" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" oninput="App.zobrazitData()"></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Řadit</label><select id="razeniSloupec" class="w-full border border-gray-300 rounded px-3 py-2 text-xs md:text-sm" onchange="App.zobrazitData()"><option value="winrate">Win %</option><option value="zapasy">Zápasy</option><option value="vyhry">Výhry</option><option value="jmeno">Jméno</option></select></div><div class="flex items-end"><button onclick="Filters.vymazat()" class="w-full bg-gray-500 hover:bg-gray-600 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded transition-colors">✕ Reset</button></div></div><div class="border-t border-gray-300 pt-3 mt-3"><div class="flex justify-between items-center mb-2"><label class="text-xs font-medium text-gray-600">Kola</label><div class="flex gap-2"><button onclick="Filters.vyberVsechna()" class="text-xs text-blue-600 hover:text-blue-800">Vše</button><button onclick="Filters.zrusVsechna()" class="text-xs text-red-600 hover:text-red-800">Žádné</button></div></div><div id="kolaCheckboxy" class="flex flex-wrap gap-2"></div></div></div>';
        
        document.getElementById('statistikyObsah').innerHTML = filtryHtml + '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"><th class="text-center p-2 font-semibold">#</th><th class="text-left p-2 font-semibold">Hráč</th><th class="text-left p-2 font-semibold">Tým</th><th class="text-center p-2 font-semibold">Z</th><th class="text-center p-2 font-semibold">V</th><th class="text-center p-2 font-semibold">P</th><th class="text-center p-2 font-semibold">Win%</th><th class="text-center p-2 font-semibold">Forma</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
};