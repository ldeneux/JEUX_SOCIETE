import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CarteRole } from '@/components/CarteRole';
import { catalogue } from '@/lib/jeux/registre';
import { ACCROCHE, NOM_PLATEFORME } from '@/lib/marque';

const VITRINE = ['dracula', 'loup_garou', 'sorciere', 'voyante', 'corbeau', 'cupidon', 'chasseur', 'loup_blanc', 'renard', 'ange'];

export default function Accueil() {
  const loups = catalogue().find((j) => j.code === 'loupgarou')!;
  return (
    <>
      <div className="fond" />
      <Nav />
      <main>
        <section className="conteneur hero">
          <div className="sur-titre">Jeux de société à secrets</div>
          <h1>{NOM_PLATEFORME}</h1>
          <p>{ACCROCHE} Pas assez d’amis ce soir ? Ajoutez des joueurs IA : ils complètent la table, ou jouent avec vous en solo.</p>
          <div className="actions">
            <Link href="/console" className="btn btn-or btn-grand">Créer une partie</Link>
            <Link href="/jouer" className="btn btn-grand">Rejoindre avec un code</Link>
          </div>
        </section>

        <section id="jeux" className="conteneur section">
          <div className="etiquette">Les jeux</div>
          <h2>Choisissez votre aventure</h2>
          <div className="liste-bannieres">
            <article className="banniere" style={{ backgroundImage: `url(${loups.visuel})` }}>
              <span className="badge badge-ok coin">Jouable</span>
              <div className="contenu">
                <h3>{loups.nom}</h3>
                <p>Le village dort, les loups rôdent, et une fenêtre s’illumine chaque nuit au sommet du château Corvin. 29 rôles, dont le Comte Dracula.</p>
                <div className="rang">
                  <span className="puce">{loups.joueurs.min}–{loups.joueurs.max} joueurs</span>
                  <span className="puce">~{loups.dureeMinutes} min</span>
                  <span className="puce">{loups.modes.length} modes</span>
                  <span className="puce">🤖 IA acceptées</span>
                </div>
                <div><Link href="/console" className="btn btn-or">Jouer</Link> <Link href="/roles" className="btn">Les 29 rôles</Link></div>
              </div>
            </article>

            <article className="banniere archives" style={{ backgroundImage: 'url(/archives/fond.webp)' }}>
              <span className="badge badge-ok coin">Jouable</span>
              <div className="contenu">
                <h3>CLUEDO : LES ARCHIVES DU TEMPS</h3>
                <p>Un artefact a disparu des Archives du Temps. Voyagez d’une civilisation à l’autre, interrogez, déduisez, accusez : chaque partie raconte une nouvelle enquête.</p>
                <div className="rang">
                  <span className="puce">2–6 joueurs</span>
                  <span className="puce">Enquêtes générées</span>
                  <span className="puce">3 modes de jeu</span>
                  <span className="puce">🤖 IA acceptées</span>
                </div>
                <div><Link href="/console" className="btn btn-or">Mener l’enquête</Link></div>
              </div>
            </article>

            <article className="banniere eldoria" style={{ backgroundImage: 'url(/eldoria/fond.webp)' }}>
              <span className="badge badge-bientot coin">En construction</span>
              <div className="contenu">
                <h3>ELDORIA : LES ROYAUMES BRISÉS</h3>
                <p>Douze cristaux, cinq royaumes, des objectifs secrets et une ombre qui dévore le monde. Explorez, conquérez, intriguez — et gardez un œil sur le trône.</p>
                <div className="rang">
                  <span className="puce">2–5 joueurs</span>
                  <span className="puce">~60 min</span>
                  <span className="puce">Jeu de cartes</span>
                  <span className="puce">Objectifs secrets</span>
                </div>
                <div><button className="btn" disabled>Bientôt disponible</button></div>
              </div>
            </article>
          </div>
        </section>

        <section id="comment" className="conteneur section">
          <div className="etiquette">Comment jouer</div>
          <h2>Prêt en trente secondes</h2>
          <div className="etapes">
            <div className="etape panneau"><h3>Ouvre la console</h3><p>Sur la télé ou l’ordinateur, crée une partie, choisis un mode et, si besoin, le nombre de joueurs IA.</p></div>
            <div className="etape panneau"><h3>Scannez le code</h3><p>Chaque joueur scanne le QR code avec son téléphone et choisit un pseudo. Rien à installer.</p></div>
            <div className="etape panneau"><h3>Reçois ton rôle</h3><p>Ta carte reste secrète sur ton écran. La nuit, ton téléphone te dit quand agir.</p></div>
            <div className="etape panneau"><h3>Débattez, votez</h3><p>La console raconte la nuit et anime le village. Les IA jouent leur rôle, sans jamais tricher.</p></div>
          </div>
        </section>

        <section className="conteneur section">
          <div className="etiquette">Le grimoire</div>
          <h2>Vingt-neuf destins, jamais deux fois la même table</h2>
          <p style={{ color: 'var(--doux)', maxWidth: 700 }}>
            Les loups ne sont plus les seuls à rôder : Dracula corrompt en silence, le Joueur de flûte enchante, le Corbeau accuse.
            Les rôles sont tirés selon le nombre de joueurs, avec un budget d’équilibre et un effet « nouveautés ».
          </p>
          <div className="defilement">
            {VITRINE.map((c) => <CarteRole key={c} code={c} />)}
          </div>
          <Link href="/roles" className="btn">Voir tous les rôles</Link>
        </section>
      </main>
      <footer className="conteneur pied">{NOM_PLATEFORME} · une console, des téléphones</footer>
    </>
  );
}
