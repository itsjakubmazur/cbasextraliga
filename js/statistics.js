const Statistics = {
    // Playoff round detection - kolo values like "QF", "SF", "F", "P5" are playoff
    isPlayoffKolo(kolo) {
        if (!kolo) return false;
        const k = kolo.replace(/\.$/, '').trim().toUpperCase();
        return ['QF', 'SF', 'F', 'P5'].includes(k);
    },

    // Map playoff kolo codes to display names
    playoffKoloNazev(kolo) {
        const k = kolo.replace(/\.$/, '').trim().toUpperCase();
        const nazvy = { 'QF': 'Čtvrtfinále', 'SF': 'Semifinále', 'F': 'Finále', 'P5': 'O 5. místo' };
        return nazvy[k] || kolo;
    },

    // Utility: HTML escape to prevent XSS
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Utility: Escape string for use in onclick attribute
    escapeAttr(str) {
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    },

    parseVysledek(vysledek) {
        const parts = (vysledek || '0:0').split(':');
        return { domaci: parseInt(parts[0]) || 0, hoste: parseInt(parts[1]) || 0 };
    },

    isSkrec(zapas) {
        return zapas.domaci === 'SKREČ' || zapas.hoste === 'SKREČ';
    },

    isNeodehrano(zapas) {
        const v = this.parseVysledek(zapas.vysledek);
        return v.domaci === 0 && v.hoste === 0 && !this.isSkrec(zapas);
    },

    parseSety(sety) {
        if (!sety) return { domaciBody: 0, hosteBody: 0 };
        const setArr = sety.split(',').map(s => s.trim());
        let domaciBody = 0, hosteBody = 0;
        setArr.forEach(set => {
            const parts = set.split(':');
            domaciBody += parseInt(parts[0]) || 0;
            hosteBody += parseInt(parts[1]) || 0;
        });
        return { domaciBody, hosteBody };
    },

    getHraciFromTeam(team) {
        return team.split(',').map(h => h.trim()).filter(h => h);
    },

    // Centralized sorting logic for league standings (used by Table and Playoff)
    seraditTymyPodleTabulky(tabulkaData) {
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

    // Centralized sorting logic for player stats (used by Players TOP3 and statistics table)
    seraditHraceStandardne(hraciList, stats) {
        return hraciList.sort((a, b) => {
            const sA = stats[a];
            const sB = stats[b];
            if (sB.vyhry !== sA.vyhry) return sB.vyhry - sA.vyhry;
            const winRateA = sA.zapasy > 0 ? (sA.vyhry / sA.zapasy) : 0;
            const winRateB = sB.zapasy > 0 ? (sB.vyhry / sB.zapasy) : 0;
            if (Math.abs(winRateA - winRateB) > 0.001) return winRateB - winRateA;
            if (sB.zapasy !== sA.zapasy) return sB.zapasy - sA.zapasy;
            const setRatioA = (sA.setVyhrane + sA.setProhrane) > 0 ? (sA.setVyhrane / (sA.setVyhrane + sA.setProhrane)) : 0;
            const setRatioB = (sB.setVyhrane + sB.setProhrane) > 0 ? (sB.setVyhrane / (sB.setVyhrane + sB.setProhrane)) : 0;
            return setRatioB - setRatioA;
        });
    },

    getForma(hrac, vsechnyZapasy) {
        const hracovaZapasy = vsechnyZapasy.filter(z => {
            const domaciHraci = this.getHraciFromTeam(z.domaci);
            const hosteHraci = this.getHraciFromTeam(z.hoste);
            return domaciHraci.includes(hrac) || hosteHraci.includes(hrac);
        }).slice(-5);
        
        return hracovaZapasy.flatMap(zapas => {
            if (this.isNeodehrano(zapas)) return []; // neodehraný zápas
            const vysledek = this.parseVysledek(zapas.vysledek);
            const domaciHraci = this.getHraciFromTeam(zapas.domaci);
            const jeHracDomaci = domaciHraci.includes(hrac);
            const vyhral = jeHracDomaci ? (vysledek.domaci > vysledek.hoste) : (vysledek.hoste > vysledek.domaci);
            return [vyhral ? 'V' : 'P'];
        }).join('');
    },

    vypocitejStatistiky(aktualni_soutez, vybrana_kola) {
        const stats = {};
        const filtrTym = document.getElementById('filtrTym')?.value || '';
        const filtrDisciplina = document.getElementById('filtrDisciplina')?.value || '';
        
        Data.zapasy[aktualni_soutez].forEach(zapas => {
            if (vybrana_kola.size > 0 && !vybrana_kola.has(zapas.kolo)) return;

            if (this.isNeodehrano(zapas)) return; // neodehraný zápas

            if (filtrDisciplina) {
                const jeDvouhra = zapas.disciplina?.toLowerCase().includes('dvouhra');
                const jeCtyrhra = zapas.disciplina?.toLowerCase().includes('čtyřhra') || 
                                  zapas.disciplina?.toLowerCase().includes('ctyrhra') || 
                                  zapas.disciplina?.toLowerCase().includes('smíšená');
                if (filtrDisciplina === 'dvouhra' && !jeDvouhra) return;
                if (filtrDisciplina === 'ctyrhra' && !jeCtyrhra) return;
            }
            
            const vysledek = this.parseVysledek(zapas.vysledek);
            const bodyData = this.parseSety(zapas.sety);
            const domaciHraci = this.getHraciFromTeam(zapas.domaci);
            const hosteHraci = this.getHraciFromTeam(zapas.hoste);
            const domaciVyhral = vysledek.domaci > vysledek.hoste;
            const jeRemiza = vysledek.domaci === vysledek.hoste;

            const initHrac = () => ({
                zapasy: 0, vyhry: 0, prohry: 0, remizy: 0,
                setVyhrane: 0, setProhrane: 0,
                bodyVyhrane: 0, bodyProhrane: 0,
                tymy: {}, vsechnyZapasy: []
            });

            if (zapas.domaci !== 'SKREČ') {
                domaciHraci.forEach(hrac => {
                    if (filtrTym && zapas.tymDomaci !== filtrTym) return;
                    if (!stats[hrac]) stats[hrac] = initHrac();
                    stats[hrac].zapasy++;
                    if (jeRemiza) stats[hrac].remizy++;
                    else if (domaciVyhral) stats[hrac].vyhry++;
                    else stats[hrac].prohry++;
                    stats[hrac].setVyhrane += vysledek.domaci;
                    stats[hrac].setProhrane += vysledek.hoste;
                    stats[hrac].bodyVyhrane += bodyData.domaciBody;
                    stats[hrac].bodyProhrane += bodyData.hosteBody;
                    if (zapas.tymDomaci) stats[hrac].tymy[zapas.tymDomaci] = (stats[hrac].tymy[zapas.tymDomaci] || 0) + 1;
                    stats[hrac].vsechnyZapasy.push(zapas);
                });
            }

            if (zapas.hoste !== 'SKREČ') {
                hosteHraci.forEach(hrac => {
                    if (filtrTym && zapas.tymHoste !== filtrTym) return;
                    if (!stats[hrac]) stats[hrac] = initHrac();
                    stats[hrac].zapasy++;
                    if (jeRemiza) stats[hrac].remizy++;
                    else if (!domaciVyhral) stats[hrac].vyhry++;
                    else stats[hrac].prohry++;
                    stats[hrac].setVyhrane += vysledek.hoste;
                    stats[hrac].setProhrane += vysledek.domaci;
                    stats[hrac].bodyVyhrane += bodyData.hosteBody;
                    stats[hrac].bodyProhrane += bodyData.domaciBody;
                    if (zapas.tymHoste) stats[hrac].tymy[zapas.tymHoste] = (stats[hrac].tymy[zapas.tymHoste] || 0) + 1;
                    stats[hrac].vsechnyZapasy.push(zapas);
                });
            }
        });
        
        return stats;
    },

    vypocitejTabulku(aktualni_soutez) {
        const tabulka = {};
        const utkani = {};
        const jePrvniLiga = aktualni_soutez.includes('prvni-liga');

        Data.zapasy[aktualni_soutez].forEach(zapas => {
            // Skip playoff matches in regular season table
            if (this.isPlayoffKolo(zapas.kolo)) return;
            const klic = zapas.kolo + '-' + zapas.tymDomaci + '-' + zapas.tymHoste;
            if (!utkani[klic]) utkani[klic] = {
                kolo: zapas.kolo,
                domaci: zapas.tymDomaci,
                hoste: zapas.tymHoste,
                zapasy: []
            };
            utkani[klic].zapasy.push(zapas);
        });
        
        Object.values(utkani).forEach(utk => {
            const domaci = utk.domaci;
            const hoste = utk.hoste;
            if (!domaci || !hoste) return;
            
            if (!tabulka[domaci]) tabulka[domaci] = {
                utkani: 0, vyhry: 0, remizy: 0, prohry: 0,
                zapasyV: 0, zapasyP: 0, setyV: 0, setyP: 0,
                bodyV: 0, bodyP: 0, body: 0
            };
            if (!tabulka[hoste]) tabulka[hoste] = {
                utkani: 0, vyhry: 0, remizy: 0, prohry: 0,
                zapasyV: 0, zapasyP: 0, setyV: 0, setyP: 0,
                bodyV: 0, bodyP: 0, body: 0
            };
            
            let domaciZapasy = 0, hosteZapasy = 0;
            let domaciSety = 0, hosteSety = 0;
            let domaciBody = 0, hosteBody = 0;
            
            utk.zapasy.forEach(zapas => {
                const vysledek = this.parseVysledek(zapas.vysledek);
                const bodyData = this.parseSety(zapas.sety);
                if (this.isNeodehrano(zapas)) return; // neodehraný zápas
                if (vysledek.domaci > vysledek.hoste) domaciZapasy++; else hosteZapasy++;
                domaciSety += vysledek.domaci;
                hosteSety += vysledek.hoste;
                domaciBody += bodyData.domaciBody;
                hosteBody += bodyData.hosteBody;
            });
            
            let domaciBodyTabulka = 0, hosteBodyTabulka = 0;
            
            if (jePrvniLiga) {
                if (domaciZapasy === hosteZapasy) {
                    domaciBodyTabulka = 2; hosteBodyTabulka = 2;
                    tabulka[domaci].remizy++; tabulka[hoste].remizy++;
                } else if (domaciZapasy > hosteZapasy) {
                    domaciBodyTabulka = 3; hosteBodyTabulka = 1;
                    tabulka[domaci].vyhry++; tabulka[hoste].prohry++;
                } else {
                    hosteBodyTabulka = 3; domaciBodyTabulka = 1;
                    tabulka[hoste].vyhry++; tabulka[domaci].prohry++;
                }
            } else {
                const domaciVyhral = domaciZapasy > hosteZapasy;
                if (domaciVyhral) {
                    if (domaciZapasy >= 6) { domaciBodyTabulka = 3; hosteBodyTabulka = 0; }
                    else if (domaciZapasy >= 4) { domaciBodyTabulka = 2; hosteBodyTabulka = 1; }
                    tabulka[domaci].vyhry++; tabulka[hoste].prohry++;
                } else {
                    if (hosteZapasy >= 6) { hosteBodyTabulka = 3; domaciBodyTabulka = 0; }
                    else if (hosteZapasy >= 4) { hosteBodyTabulka = 2; domaciBodyTabulka = 1; }
                    tabulka[hoste].vyhry++; tabulka[domaci].prohry++;
                }
            }
            
            tabulka[domaci].utkani++;
            tabulka[domaci].zapasyV += domaciZapasy;
            tabulka[domaci].zapasyP += hosteZapasy;
            tabulka[domaci].setyV += domaciSety;
            tabulka[domaci].setyP += hosteSety;
            tabulka[domaci].bodyV += domaciBody;
            tabulka[domaci].bodyP += hosteBody;
            tabulka[domaci].body += domaciBodyTabulka;
            
            tabulka[hoste].utkani++;
            tabulka[hoste].zapasyV += hosteZapasy;
            tabulka[hoste].zapasyP += domaciZapasy;
            tabulka[hoste].setyV += hosteSety;
            tabulka[hoste].setyP += domaciSety;
            tabulka[hoste].bodyV += hosteBody;
            tabulka[hoste].bodyP += domaciBody;
            tabulka[hoste].body += hosteBodyTabulka;
        });
        
        return tabulka;
    }
};