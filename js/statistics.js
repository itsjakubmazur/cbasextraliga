const Statistics = {
    parseVysledek(vysledek) {
        const parts = vysledek.split(':');
        return { domaci: parseInt(parts[0]) || 0, hoste: parseInt(parts[1]) || 0 };
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

    getForma(hrac, vsechnyZapasy) {
        const hracovaZapasy = vsechnyZapasy.filter(z => {
            const domaciHraci = this.getHraciFromTeam(z.domaci);
            const hosteHraci = this.getHraciFromTeam(z.hoste);
            return domaciHraci.includes(hrac) || hosteHraci.includes(hrac);
        }).slice(-5);
        
        return hracovaZapasy.map(zapas => {
            const vysledek = this.parseVysledek(zapas.vysledek);
            const domaciHraci = this.getHraciFromTeam(zapas.domaci);
            const jeHracDomaci = domaciHraci.includes(hrac);
            const vyhral = jeHracDomaci ? (vysledek.domaci > vysledek.hoste) : (vysledek.hoste > vysledek.domaci);
            return vyhral ? 'V' : 'P';
        }).join('');
    },

    vypocitejStatistiky(aktualni_soutez, vybrana_kola) {
        const stats = {};
        const filtrTym = document.getElementById('filtrTym')?.value || '';
        const filtrDisciplina = document.getElementById('filtrDisciplina')?.value || '';
        
        Data.zapasy[aktualni_soutez].forEach(zapas => {
            if (vybrana_kola.size > 0 && !vybrana_kola.has(zapas.kolo)) return;
            
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
            
            if (zapas.domaci !== 'SKREČ') {
                domaciHraci.forEach(hrac => {
                    if (filtrTym && zapas.tymDomaci !== filtrTym) return;
                    if (!stats[hrac]) stats[hrac] = {
                        zapasy: 0, vyhry: 0, prohry: 0,
                        setVyhrane: 0, setProhrane: 0,
                        bodyVyhrane: 0, bodyProhrane: 0,
                        tymy: {}, vsechnyZapasy: []
                    };
                    stats[hrac].zapasy++;
                    if (domaciVyhral) stats[hrac].vyhry++; else stats[hrac].prohry++;
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
                    if (!stats[hrac]) stats[hrac] = {
                        zapasy: 0, vyhry: 0, prohry: 0,
                        setVyhrane: 0, setProhrane: 0,
                        bodyVyhrane: 0, bodyProhrane: 0,
                        tymy: {}, vsechnyZapasy: []
                    };
                    stats[hrac].zapasy++;
                    if (!domaciVyhral) stats[hrac].vyhry++; else stats[hrac].prohry++;
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