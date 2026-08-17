const Statistics = {
    KRATKE_NAZVY: {
        'SK Brno Slatina':                 'Slatina',
        'SK Brno Slatina B':               'Slatina B',
        'B.O. Chance Ostrava Sportclub':   'Ostrava',
        'BA Plzeň':                        'Plzeň',
        'BA Plzeň B':                      'Plzeň B',
        'BK Meteor Praha':                 'Meteor',
        'BK 1973 Benátky nad Jizerou':     'Benátky',
        'TJ Sokol Klimkovice':             'Klimkovice',
        'TJ Sokol Klimkovice B':           'Klimkovice B',
        'Badminton FSpS MU':               'FSpS MU',
        'Badminton FSpS MU B':             'FSpS MU B',
        'SK Prosek Praha':                 'Prosek',
        'SK Prosek Praha B':               'Prosek B',
        'SK Kuklenská Brno':               'Kuklenská',
        'TJ Sokol Dobruška':               'Dobruška',
        'TJ Montas Hradec Králové':        'Montas HK',
        'TJ Slavoj Český Těšín':           'Slavoj ČT',
        'TJ Sokol Polabiny Pardubice':     'Pardubice',
        'BK Kopřivnice':                   'Kopřivnice',
        'Badminton Akademie Olomouc':      'Olomouc',
        'SK Hamr':                         'Hamr',
        'SK Hamr Praha':                   'Hamr Praha',
        'BaC Kladno':                      'Kladno',
        'SKB Český Krumlov':               'Krumlov',
        'TJ Sokol Radotín':                'Radotín',
        'Sokol Radotín Meteor Praha':      'Radotín',
        'TJ Astra ZM Praha':               'Astra ZM',
        'TJ Astra Zahradní Město':         'Astra ZM',
        'TJ Slovan Vesec':                 'Vesec',
        'BK Liberec':                      'Liberec',
        'BK TU v Liberci':                 'TU Liberec',
        'TJ Orlová-Lutyně':                'Orlová',
    },

    zkracenyNazev(tym) {
        return this.KRATKE_NAZVY[tym] || tym;
    },

    // Playoff round detection - kolo values like "QF", "SF", "F", "P5" are playoff
    isPlayoffKolo(kolo) {
        if (!kolo) return false;
        const k = kolo.replace(/\.$/, '').trim().toUpperCase();
        return ['QF', 'SF', 'F', 'P5', '3M', 'P3', 'RR'].includes(k);
    },

    // Normalize kolo code: P3 → 3M (user enters "P3" for 3rd place matches)
    normalizeKolo(kolo) {
        const k = kolo.replace(/\.$/, '').trim().toUpperCase();
        return k === 'P3' ? '3M' : k;
    },

    playoffKoloNazev(kolo) {
        const k = this.normalizeKolo(kolo);
        const nazvy = { 'QF': 'Čtvrtfinále', 'SF': 'Semifinále', 'F': 'Finále', 'P5': 'O 5. místo', '3M': 'O 3. místo', 'RR': 'Baráž' };
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

    // Returns all matches for a soutez, including playoff matches for 1. liga groups
    getZapasyProSoutez(aktualni_soutez) {
        const zapasy = [...(Data.zapasy[aktualni_soutez] || [])];
        if (aktualni_soutez === 'prvni-liga-vychod' || aktualni_soutez === 'prvni-liga-zapad') {
            return zapasy.concat(Data.zapasy['prvni-liga-playoff'] || []);
        }
        return zapasy;
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

        // Pro 1. ligu: při play-off zápasech počítat jen hráče vlastní konference
        const jeKonference = aktualni_soutez === 'prvni-liga-vychod' || aktualni_soutez === 'prvni-liga-zapad';
        const tymyKonference = jeKonference ? new Set(Data.tymy[aktualni_soutez] || []) : null;

        this.getZapasyProSoutez(aktualni_soutez).forEach(zapas => {
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
                    if (tymyKonference && this.isPlayoffKolo(zapas.kolo) && !tymyKonference.has(zapas.tymDomaci)) return;
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
                    if (tymyKonference && this.isPlayoffKolo(zapas.kolo) && !tymyKonference.has(zapas.tymHoste)) return;
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

    // Returns last N match results for a team as array of 'w'/'l'/'d'
    vypocitejFormuTymu(tym, aktualni_soutez, pocet = 5) {
        const utkani = {};
        (Data.zapasy[aktualni_soutez] || []).forEach(zapas => {
            if (this.isPlayoffKolo(zapas.kolo)) return;
            if (!zapas.tymDomaci || !zapas.tymHoste) return;
            if (zapas.tymDomaci !== tym && zapas.tymHoste !== tym) return;
            const klic = zapas.kolo + '-' + zapas.tymDomaci + '-' + zapas.tymHoste;
            if (!utkani[klic]) utkani[klic] = { kolo: parseInt(zapas.kolo) || 0, domaci: zapas.tymDomaci, d: 0, h: 0 };
            const v = this.parseVysledek(zapas.vysledek);
            utkani[klic].d += v.domaci;
            utkani[klic].h += v.hoste;
        });
        return Object.values(utkani)
            .filter(u => u.d + u.h > 0)
            .sort((a, b) => a.kolo - b.kolo)
            .slice(-pocet)
            .map(u => {
                const nase = u.domaci === tym ? u.d : u.h;
                const soupere = u.domaci === tym ? u.h : u.d;
                return nase > soupere ? 'w' : nase < soupere ? 'l' : 'd';
            });
    },

    // Returns { tym: delta } where delta = positions gained since previous round
    // positive = moved up, negative = moved down, 0 = no change
    vypocitejZmenyPozic(aktualni_soutez) {
        const kola = (Data.zapasy[aktualni_soutez] || [])
            .map(z => parseInt(z.kolo))
            .filter(k => !isNaN(k));
        if (kola.length === 0) return {};
        const maxKolo = Math.max(...kola);
        if (maxKolo <= 1) return {};

        const prevTabulka = this.vypocitejTabulku(aktualni_soutez, maxKolo - 1);
        const prevOrder = this.seraditTymyPodleTabulky(prevTabulka);
        const currTabulka = this.vypocitejTabulku(aktualni_soutez);
        const currOrder = this.seraditTymyPodleTabulky(currTabulka);

        const prevPozice = {};
        prevOrder.forEach((tym, idx) => { prevPozice[tym] = idx + 1; });

        const zmeny = {};
        currOrder.forEach((tym, idx) => {
            const curr = idx + 1;
            const prev = prevPozice[tym];
            zmeny[tym] = prev !== undefined ? prev - curr : 0;
        });
        return zmeny;
    },

    // Zaloha pro pripad, ze konfig.bodovani[soutez] chybi (stary JSON pred migraci
    // apod.) - reprodukuje puvodni natvrdo zadratovane hodnoty podle jePrvniLiga.
    _FALLBACK_BODOVANI: {
        extraliga: { typ: 'margin-tiered', remizaMozna: false, tiers: [{ minZapasyVitez: 6, body: [3, 0] }, { minZapasyVitez: 4, body: [2, 1] }] },
        prvniLiga: { typ: 'win-draw-loss', remizaMozna: true, body: { vyhra: 3, remiza: 2, prohra: 1 } }
    },

    // Cista funkce: kolik bodu do tabulky dostane domaci/hoste tym za utkani
    // s danym poctem vyhranych dilcich zapasu, podle konfigurace bodovani.
    vypocitejBodyUtkani(domaciZapasy, hosteZapasy, bodovani) {
        const out = { domaciBody: 0, hosteBody: 0, domaciVysledek: 'P', hosteVysledek: 'P' };

        if (bodovani.typ === 'win-draw-loss') {
            if (domaciZapasy === hosteZapasy) {
                out.domaciBody = bodovani.body.remiza; out.hosteBody = bodovani.body.remiza;
                out.domaciVysledek = 'R'; out.hosteVysledek = 'R';
            } else if (domaciZapasy > hosteZapasy) {
                out.domaciBody = bodovani.body.vyhra; out.hosteBody = bodovani.body.prohra;
                out.domaciVysledek = 'V'; out.hosteVysledek = 'P';
            } else {
                out.hosteBody = bodovani.body.vyhra; out.domaciBody = bodovani.body.prohra;
                out.hosteVysledek = 'V'; out.domaciVysledek = 'P';
            }
            return out;
        }

        // margin-tiered: body podle poctu vyhranych dilcich zapasu viteze
        const domaciVyhral = domaciZapasy > hosteZapasy;
        const vitezZapasy = domaciVyhral ? domaciZapasy : hosteZapasy;
        let vitezBody = 0, porazenyBody = 0;
        const tiers = bodovani.tiers || [];
        for (const tier of tiers) {
            if (vitezZapasy >= tier.minZapasyVitez) { vitezBody = tier.body[0]; porazenyBody = tier.body[1]; break; }
        }
        if (domaciVyhral) {
            out.domaciBody = vitezBody; out.hosteBody = porazenyBody;
            out.domaciVysledek = 'V'; out.hosteVysledek = 'P';
        } else {
            out.hosteBody = vitezBody; out.domaciBody = porazenyBody;
            out.hosteVysledek = 'V'; out.domaciVysledek = 'P';
        }
        return out;
    },

    vypocitejTabulku(aktualni_soutez, doKola = null, konfig = null) {
        const tabulka = {};
        const utkani = {};
        const kfg = konfig || Data.getKonfigurace(App.aktualni_rocnik);
        const bodovani = (kfg.bodovani && kfg.bodovani[aktualni_soutez])
            || (aktualni_soutez.includes('prvni-liga') ? this._FALLBACK_BODOVANI.prvniLiga : this._FALLBACK_BODOVANI.extraliga);

        Data.zapasy[aktualni_soutez].forEach(zapas => {
            // Skip playoff matches in regular season table
            if (this.isPlayoffKolo(zapas.kolo)) return;
            if (doKola !== null) {
                const k = parseInt(zapas.kolo);
                if (isNaN(k) || k > doKola) return;
            }
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
            
            const vysledekUtkani = this.vypocitejBodyUtkani(domaciZapasy, hosteZapasy, bodovani);
            const domaciBodyTabulka = vysledekUtkani.domaciBody;
            const hosteBodyTabulka = vysledekUtkani.hosteBody;

            if (vysledekUtkani.domaciVysledek === 'R') { tabulka[domaci].remizy++; tabulka[hoste].remizy++; }
            else if (vysledekUtkani.domaciVysledek === 'V') { tabulka[domaci].vyhry++; tabulka[hoste].prohry++; }
            else { tabulka[hoste].vyhry++; tabulka[domaci].prohry++; }

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