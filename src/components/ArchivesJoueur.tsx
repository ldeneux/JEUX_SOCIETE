'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { VueJoueur } from '@/lib/jeux/contract';
import { appeler } from '@/lib/client/api';
import { Actions } from '@/components/Actions';
import { CarnetArchives, type DonneesCarnet } from '@/components/CarnetArchives';
import { CartePerso } from '@/components/CartePerso';
import { imgCarte, imgLieu, imgPerso, imgPnj } from '@/lib/jeux/archives/images';
import { PERSO_PAR_CODE } from '@/lib/jeux/archives/donnees';

interface NoeudJ { id: string; nom: string; type: 'lieu' | 'secondaire'; x: number; y: number; region: string; epoque: string; role: string; ferme: boolean; visite: boolean; pnj: string | null }
interface PionJ { id: string; pseudo: string; perso: string; noeud: string; elimine: boolean; moi: boolean }
interface PnjJ { code: string; nom: string; role: string; specialite: string | null; noeud: string | null; lieu: string | null; vu: boolean; ici: boolean }
export interface DonneesJoueur extends DonneesCarnet {
  positionId: string; pouvoirUtilise: boolean; manche: number; toursMax: number; etape: string; monTour: boolean;
  actif: { id: string; pseudo: string } | null; nbCartes: number; dests: Record<string, number>; destsMode: 'pas' | 'raccourci';
  noeuds: NoeudJ[]; pions: PionJ[]; pnj: PnjJ[];
}

type Onglet = 'camp' | 'enqueteur' | 'carte' | 'carnet' | 'indices';
const ETIQUETTE_CAT: Record<string, string> = { suspect: 'Suspect', artefact: 'Artefact', lieu: 'Lieu', mobile: 'Mobile' };
const SPECIALITE: Record<string, string> = { suspect: 'suspects', artefact: 'artefacts', lieu: 'lieux', mobile: 'mobiles' };

interface Props { code: string; vue: VueJoueur; version: number; pseudos: Record<string, string>; secondes: number | null; pseudo: string }

/** Interface joueur de « Les Archives du Temps » : bandeau d'état, carte du monde, carnet visuel, répertoire des PNJ, actions. */
export function ArchivesJoueur({ code, vue, version, pseudos, secondes, pseudo }: Props) {
  const d = vue.donnees as unknown as DonneesJoueur;
  const fin = vue.ecran === 'fin';
  const aAgir = vue.actions.length > 0;
  const [onglet, setOnglet] = useState<Onglet>('camp');
  const [inspecte, setInspecte] = useState<string>(d.positionId);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  // Bascule automatique sur « Mon tour » quand l'enquête t'attend.
  const avant = useRef(false);
  useEffect(() => {
    if (aAgir && !avant.current) setOnglet('camp');
    avant.current = aAgir;
  }, [aAgir]);
  useEffect(() => setInspecte(d.positionId), [d.positionId]);

  const noeud = useMemo(() => Object.fromEntries(d.noeuds.map((n) => [n.id, n])), [d.noeuds]);
  const ici = noeud[d.positionId];
  const pct = Math.max(0, Math.min(100, Math.round(((d.toursMax - d.manche + 1) / d.toursMax) * 100)));
  const phase = pct > 60 ? ['Flux stable', 'ok'] : pct > 30 ? ['Instabilité', 'warn'] : ['Alerte', 'danger'];
  const urgent = secondes !== null && secondes <= 5;

  async function allerA(id: string) {
    setEnvoi(true); setErreur('');
    try { await appeler(`/api/salons/${code}/action`, { corps: { id: 'dest', valeur: id } }); setOnglet('camp'); }
    catch (e) { setErreur((e as Error).message); }
    finally { setEnvoi(false); }
  }

  const voirSurCarte = (id: string | null) => { if (id) { setInspecte(id); setOnglet('carte'); } };
  const perso = PERSO_PAR_CODE[vue.carte?.code ?? ''];
  const main = d.carnet.flatMap((sec) => sec.cartes.filter((k) => k.statut === 'main').map((k) => ({ ...k, cat: sec.cat })));
  const tabs: { id: Onglet; icone: string; nom: string; alerte?: boolean }[] = [
    { id: 'camp', icone: fin ? '🏆' : '🏕️', nom: fin ? 'Verdict' : 'Camp de base', alerte: aAgir && onglet !== 'camp' },
    { id: 'enqueteur', icone: '🕵️', nom: 'Enquêteur' },
    { id: 'carte', icone: '🗺️', nom: 'Carte' },
    { id: 'carnet', icone: '📓', nom: 'Carnet' },
    { id: 'indices', icone: '🔎', nom: 'Indices' },
  ];

  return (
    <div className="ap">
      {/* ---------- HUD ---------- */}
      <header className="ap-hud">
        <div className="ap-hud-ligne">
          <div className="ap-titre">
            <span className="ap-embleme" aria-hidden>⏳</span>
            <div><strong>Les Archives du Temps</strong><small>{pseudo || 'Enquêteur'} · {perso?.nom}</small></div>
          </div>
          <span className={`ap-chrono${urgent ? ' urgent' : ''}`}>{secondes !== null && !fin ? `${secondes}s` : ''}</span>
        </div>
        <div className="ap-sablier">
          <div className="ap-sablier-tete">
            <span className={`ap-phase ${phase[1]}`}>{phase[0]}</span>
            <span className="ap-manche"><b>{Math.min(d.manche, d.toursMax)}</b> / {d.toursMax} manches</span>
          </div>
          <div className="ap-barre"><div style={{ width: `${pct}%` }} /></div>
        </div>
      </header>

      {/* ---------- Une seule ligne d'onglets ---------- */}
      <nav className="ap-onglets" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={onglet === t.id} className={onglet === t.id ? 'actif' : ''} onClick={() => setOnglet(t.id)}>
            <span>{t.icone}</span>{t.nom}{t.alerte && <i className="ap-alerte" />}
          </button>
        ))}
      </nav>

      {/* ---------- Camp de base : position, actions, cartes en main ---------- */}
      {onglet === 'camp' && (
        <section className="ap-panneau ap-action">
          {ici && (
            <button type="button" className="ap-camp" onClick={() => voirSurCarte(d.positionId)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgLieu(ici.id)} alt="" />
              <span>
                <small>📍 Camp de base · {ici.type === 'lieu' ? 'Lieu principal' : 'Site secondaire'}</small>
                <b>{ici.nom}</b>
                <em>{ici.region}</em>
              </span>
              <i>Carte →</i>
            </button>
          )}
          <div className="ap-etat">
            <span className="ap-etiquette">{fin ? 'Conseil des Archives' : aAgir ? 'Ton tour' : 'En attente'}</span>
            <h1>{vue.titre}</h1>
            {vue.message && <div className="message">{vue.message}</div>}
          </div>
          {aAgir && <Actions code={code} actions={vue.actions} version={version} pseudos={pseudos} />}
          {!aAgir && !fin && d.actif && <p className="ap-doux">Observe la carte et complète ton carnet pendant que {d.actif.pseudo} joue.</p>}

          <div className="ap-cartes">
            <h2 className="ap-h2">Mes cartes <small>({main.length})</small></h2>
            <p className="ap-doux">Ces cartes sont dans ta main : elles ne sont donc pas dans la solution.</p>
            <ul className="ap-main">
              {main.map((k) => (
                <li key={k.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgCarte(k.cat, k.id)} alt="" loading="lazy" />
                  <span>{k.nom}</span>
                  <small>{ETIQUETTE_CAT[k.cat]}</small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------- Enquêteur ---------- */}
      {onglet === 'enqueteur' && vue.carte && (
        <section className="ap-panneau ap-enq">
          <CartePerso code={vue.carte.code} grande />
          <div className="ap-enq-texte">
            <span className="ap-etiquette">{perso?.role}</span>
            <h2 className="ap-h2">{perso?.nom}</h2>
            <p><b>{perso?.pouvoir}</b> — {perso?.resume}</p>
            {perso?.actif && <span className={`ap-tag ${d.pouvoirUtilise ? 'gris' : 'or'}`}>{d.pouvoirUtilise ? 'Pouvoir déjà utilisé' : 'Pouvoir disponible'}</span>}
            <ul className="ap-stats">
              <li><b>{d.noeuds.filter((n) => n.type === 'lieu' && n.visite).length}</b> / 12 lieux visités</li>
              <li><b>{d.pnj.filter((p) => p.vu).length}</b> / 15 PNJ consultés</li>
              <li><b>{d.nbCartes}</b> cartes en main</li>
            </ul>
          </div>
        </section>
      )}

      {/* ---------- Carte ---------- */}
      {onglet === 'carte' && (
        <section className="ap-panneau">
          <CarteMonde d={d} noeud={noeud} inspecte={inspecte} onInspecter={setInspecte} />
          <Inspecteur d={d} n={noeud[inspecte]} pnj={d.pnj} envoi={envoi} erreur={erreur} onAller={allerA} />
        </section>
      )}

      {/* ---------- Carnet ---------- */}
      {onglet === 'carnet' && (
        <section className="ap-panneau"><CarnetArchives donnees={d} code={code} /></section>
      )}

      {/* ---------- Indices : ce que j'ai appris + répertoire des PNJ ---------- */}
      {onglet === 'indices' && (
        <section className="ap-panneau">
          <h2 className="ap-h2">Mes indices <small>({vue.secrets.length})</small></h2>
          {vue.secrets.length > 0 ? (
            <div className="secrets">{[...vue.secrets].reverse().map((s, i) => <div key={i}><b>{s.libelle}</b>{s.valeur}</div>)}</div>
          ) : <p className="ap-doux">Aucun indice pour l’instant : interroge un PNJ ou formule une hypothèse.</p>}

          <h2 className="ap-h2" style={{ marginTop: '1.2rem' }}>Les 15 PNJ</h2>
          <p className="ap-doux">Chaque témoin ne parle qu’une fois par enquêteur. Sur un lieu principal, interroger le PNJ remplace ton hypothèse ; sur un site secondaire, c’est tout l’intérêt de la visite.</p>
          <ul className="ap-pnj">
            {d.pnj.map((p) => (
              <li key={p.code} className={`${p.vu ? 'vu' : ''}${p.ici ? ' ici' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPnj(p.code)} alt="" loading="lazy" />
                <div>
                  <b>{p.nom}</b>
                  <small>{p.lieu ?? '—'}{p.specialite ? ` · ${SPECIALITE[p.specialite]}` : ''}</small>
                  <p>{p.role}</p>
                </div>
                <div className="ap-pnj-cote">
                  <span className={`ap-tag ${p.vu ? 'gris' : p.ici ? 'or' : 'vert'}`}>{p.vu ? 'Consulté' : p.ici ? 'Ici' : 'À voir'}</span>
                  <button type="button" className="ap-lien" onClick={() => voirSurCarte(p.noeud)}>Carte →</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Carte du monde pannable : repères principaux / secondaires, pions des enquêteurs, destinations possibles en surbrillance. */
function CarteMonde({ d, noeud, inspecte, onInspecter }: { d: DonneesJoueur; noeud: Record<string, NoeudJ>; inspecte: string; onInspecter: (id: string) => void }) {
  const defil = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = defil.current; const n = noeud[d.positionId];
    if (el && n) el.scrollTo({ left: Math.max(0, (n.x / 100) * el.scrollWidth - el.clientWidth / 2), behavior: 'smooth' });
  }, [d.positionId, noeud]);
  const parNoeud = new Map<string, PionJ[]>();
  for (const p of d.pions) parNoeud.set(p.noeud, [...(parNoeud.get(p.noeud) ?? []), p]);

  return (
    <>
      <div className="ap-legende">
        <span><i className="pt actuel" />Ta position</span><span><i className="pt principal" />Principal (12)</span>
        <span><i className="pt secondaire" />Secondaire (5)</span><span><i className="pt dest" />Accessible</span>
      </div>
      <div className="ap-carte-defil" ref={defil}>
        <div className="ap-carte">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/archives/fond.webp" alt="Carte des Archives du Temps" draggable={false} />
          <div className="ap-carte-voile" />
          {d.noeuds.map((n) => {
            const accessible = n.id in d.dests && n.id !== d.positionId;
            const cls = `ap-rep ${n.type}${n.id === d.positionId ? ' actuel' : ''}${n.id === inspecte ? ' inspecte' : ''}${accessible ? ' dest' : ''}${n.ferme ? ' ferme' : ''}${n.visite ? ' visite' : ''}`;
            return (
              <button key={n.id} type="button" className={cls} style={{ left: `${n.x}%`, top: `${n.y}%` }} onClick={() => onInspecter(n.id)} aria-label={n.nom}>
                {(n.id === inspecte || n.id === d.positionId) && <span className="ap-rep-nom">{n.ferme ? '⛔ ' : ''}{n.nom}</span>}
              </button>
            );
          })}
          {[...parNoeud.entries()].map(([id, liste]) => (
            <div key={id} className="ap-pions" style={{ left: `${noeud[id].x}%`, top: `${noeud[id].y}%` }}>
              {liste.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} className={`ap-pion${p.moi ? ' moi' : ''}${p.elimine ? ' elimine' : ''}`} src={imgPerso(p.perso)} alt={p.pseudo} title={p.pseudo} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Inspecteur({ d, n, pnj, envoi, erreur, onAller }: { d: DonneesJoueur; n?: NoeudJ; pnj: PnjJ[]; envoi: boolean; erreur: string; onAller: (id: string) => void }) {
  if (!n) return null;
  const local = pnj.find((p) => p.code === n.pnj);
  const dist = d.dests[n.id];
  const surPlace = n.id === d.positionId;
  const peut = d.monTour && dist !== undefined && !surPlace && !n.ferme;
  const cout = dist === undefined ? '—' : surPlace ? 'Position' : d.destsMode === 'raccourci' ? 'Instantané' : `${dist} pas`;
  return (
    <div className="ap-insp">
      <div className="ap-insp-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgLieu(n.id)} alt="" />
      </div>
      <div className="ap-insp-corps">
        <div className="ap-insp-tete">
          <div>
            <span className={`ap-tag ${n.type === 'lieu' ? 'vert' : 'bleu'}`}>{n.type === 'lieu' ? 'Lieu principal' : 'Site secondaire'}</span>
            <span className="ap-doux"> {n.region}</span>
            <h3>{n.nom}</h3>
          </div>
          <div className="ap-cout"><small>Trajet</small><b>{cout}</b></div>
        </div>
        <div className="ap-role"><small>Rôle stratégique · {n.epoque}</small><p>{n.role}{n.type === 'secondaire' ? ' Aucune hypothèse possible ici : on y consulte seulement le témoin.' : ' Tu peux y formuler une hypothèse.'}</p></div>
        {n.ferme && <div className="erreur">⛔ Faille temporelle : site inaccessible pendant cette manche.</div>}
        <div className="ap-contact">
          {local ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgPnj(local.code)} alt="" />
              <div><small>Contact sur place</small><b>{local.nom}</b></div>
              <span className={`ap-tag ${local.vu ? 'gris' : 'vert'}`}>{local.vu ? 'Consulté' : 'À consulter'}</span>
            </>
          ) : <div><small>Contact sur place</small><b>Personne</b></div>}
        </div>
        <button type="button" className="ap-aller" disabled={!peut || envoi} onClick={() => onAller(n.id)}>
          {surPlace ? 'Vous êtes déjà sur ce lieu' : peut ? `Se rendre à ${n.nom}` : d.monTour && dist === undefined ? 'Hors de portée ce tour-ci' : 'Disponible à ton tour de déplacement'}
        </button>
        {erreur && <div className="erreur">{erreur}</div>}
      </div>
    </div>
  );
}
