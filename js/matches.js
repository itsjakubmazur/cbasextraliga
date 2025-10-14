const Matches = {
    render(aktualni_soutez) {
        document.getElementById('pocetZapasu').textContent = Data.zapasy[aktualni_soutez].length;
        
        const rows = Data.zapasy[aktualni_soutez].map(zapas => {
            return '<tr class="border-b border-gray-200 hover:bg-gray-50"><td class="p-2">' + zapas.kolo + '</td><td class="p-2">' + (zapas.datum || '-') + '</td><td class="p-2">' + zapas.disciplina + '</td><td class="p-2 text-blue-600 clickable" onclick="Modals.zobrazitDetailTymu(\'' + (zapas.tymDomaci || '') + '\')">' + (zapas.tymDomaci || '-') + '</td><td class="p-2 ' + (zapas.domaci === 'SKREČ' ? 'text-red-500 font-semibold' : '') + '">' + zapas.domaci + '</td><td class="p-2 text-blue-600 clickable" onclick="Modals.zobrazitDetailTymu(\'' + (zapas.tymHoste || '') + '\')">' + (zapas.tymHoste || '-') + '</td><td class="p-2 ' + (zapas.hoste === 'SKREČ' ? 'text-red-500 font-semibold' : '') + '">' + zapas.hoste + '</td><td class="p-2 font-bold">' + zapas.vysledek + '</td><td class="p-2 text-xs text-gray-600">' + (zapas.sety || '-') + '</td></tr>';
        }).join('');
        
        document.getElementById('zapasyObsah').innerHTML = '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="bg-gray-100 border-b-2 border-gray-200"><th class="text-left p-2 font-semibold text-gray-700">Kolo</th><th class="text-left p-2 font-semibold text-gray-700">Datum</th><th class="text-left p-2 font-semibold text-gray-700">Disciplína</th><th class="text-left p-2 font-semibold text-gray-700">Tým D</th><th class="text-left p-2 font-semibold text-gray-700">Domácí</th><th class="text-left p-2 font-semibold text-gray-700">Tým H</th><th class="text-left p-2 font-semibold text-gray-700">Hosté</th><th class="text-left p-2 font-semibold text-gray-700">Výsl.</th><th class="text-left p-2 font-semibold text-gray-700">Skóre</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
};