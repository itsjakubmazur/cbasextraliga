const Table = {
    render(aktualni_soutez) {
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
        const legendaInfo = jePrvniLiga
            ? '<div class="flex flex-wrap gap-3 mt-2 text-xs md:text-sm"><span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> 1.–4. Play-off</span><span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-50 border border-red-200"></span> 9. Kvalifikace o 1. ligu</span></div>'
            : '<div class="flex flex-wrap gap-3 mt-2 text-xs md:text-sm"><span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> 1.–2. Přímý postup do Final Four</span><span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> 3.–6. Čtvrtfinále</span><span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-50 border border-red-200"></span> 8. Baráž</span></div>';
        const bodovaniInfo = jePrvniLiga
            ? '<p class="font-semibold mb-2">Bodování 1. ligy:</p><ul class="list-disc list-inside space-y-1 text-xs md:text-sm"><li>Výhra (8:0, 7:1, 6:2, 5:3) = 3 body</li><li>Remíza (4:4) = 2 body pro oba týmy</li><li>Prohra (3:5, 2:6, 1:7, 0:8) = 1 bod</li></ul>'
            : '<p class="font-semibold mb-2">Bodování extraligy:</p><ul class="list-disc list-inside space-y-1 text-xs md:text-sm"><li>Výhra 7:0, 6:1 = 3 body</li><li>Výhra 5:2, 4:3 = 2 body</li><li>Prohra 3:4, 2:5 = 1 bod</li><li>Prohra 1:6, 0:7 = 0 bodů</li></ul>';
        
        const rows = tymy.map((tym, idx) => {
            const t = tabulkaData[tym];
            const rozdilZapasy = t.zapasyV - t.zapasyP;
            const rozdilSety = t.setyV - t.setyP;
            const rozdilBody = t.bodyV - t.bodyP;
            
            let poziceClass = '';
            if (jePrvniLiga) {
                if (idx <= 3) poziceClass = 'bg-green-100 font-semibold';
                else if (idx === 8) poziceClass = 'bg-red-50';
            } else {
                if (idx <= 1) poziceClass = 'bg-green-100 font-semibold';
                else if (idx >= 2 && idx <= 5) poziceClass = 'bg-blue-100';
                else if (idx === 7) poziceClass = 'bg-red-50';
            }
            
            const sipkaZapasy = rozdilZapasy > 0 ? '↗' : (rozdilZapasy < 0 ? '↘' : '→');
            const sipkaSety = rozdilSety > 0 ? '↗' : (rozdilSety < 0 ? '↘' : '→');
            const sipkaBody = rozdilBody > 0 ? '↗' : (rozdilBody < 0 ? '↘' : '→');
            
            return '<tr class="border-b border-gray-200 hover:bg-green-50"><td class="p-2 text-center font-bold ' + poziceClass + '">' + (idx + 1) + '.</td><td class="p-2 font-semibold ' + poziceClass + ' clickable" onclick="Modals.zobrazitDetailTymu(\'' + tym + '\')">' + tym + '</td><td class="p-2 text-center">' + t.utkani + '</td><td class="p-2 text-center text-green-600 font-semibold">' + t.vyhry + '</td><td class="p-2 text-center text-yellow-600 font-semibold">' + t.remizy + '</td><td class="p-2 text-center text-red-600 font-semibold">' + t.prohry + '</td><td class="p-2 text-center"><span class="font-semibold">' + t.zapasyV + ':' + t.zapasyP + '</span> <span class="text-xs ' + (rozdilZapasy >= 0 ? 'text-green-600' : 'text-red-600') + '">' + sipkaZapasy + (rozdilZapasy >= 0 ? '+' : '') + rozdilZapasy + '</span></td><td class="p-2 text-center"><span class="font-semibold">' + t.setyV + ':' + t.setyP + '</span> <span class="text-xs ' + (rozdilSety >= 0 ? 'text-green-600' : 'text-red-600') + '">' + sipkaSety + (rozdilSety >= 0 ? '+' : '') + rozdilSety + '</span></td><td class="p-2 text-center"><span class="font-semibold">' + t.bodyV + ':' + t.bodyP + '</span> <span class="text-xs ' + (rozdilBody >= 0 ? 'text-green-600' : 'text-red-600') + '">' + sipkaBody + (rozdilBody >= 0 ? '+' : '') + rozdilBody + '</span></td><td class="p-2 text-center font-bold text-base md:text-lg text-blue-700">' + t.body + '</td></tr>';
        }).join('');
        
        document.getElementById('tabulkaObsah').innerHTML = '<div class="overflow-x-auto"><table class="w-full text-xs md:text-sm"><thead><tr class="text-white" style="background-color:#ed1c24"><th class="text-center p-2 md:p-3 font-semibold">#</th><th class="text-left p-2 md:p-3 font-semibold">Tým</th><th class="text-center p-2 md:p-3 font-semibold">U</th><th class="text-center p-2 md:p-3 font-semibold">V</th><th class="text-center p-2 md:p-3 font-semibold">R</th><th class="text-center p-2 md:p-3 font-semibold">P</th><th class="text-center p-2 md:p-3 font-semibold">Zápasy</th><th class="text-center p-2 md:p-3 font-semibold">Sety</th><th class="text-center p-2 md:p-3 font-semibold">Body</th><th class="text-center p-2 md:p-3 font-semibold font-bold">Bodů</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="mt-4 text-xs md:text-sm text-gray-600">' + legendaInfo + '<div class="mt-3">' + bodovaniInfo + '</div></div>';
    }
};