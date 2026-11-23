import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CarteRole } from '@/components/CarteRole';
import { catalogue } from '@/lib/jeux/registre';

const VITRINE = ['dracula', 'loup_garou', 'sorciere', 'voyante', 'corbeau', 'cupidon', 'chasseur', 'loup_blanc', 'renard', 'ange'];

export default function Accueil() {
  const jeux = catalogue();
  return (
    <>
      <div className="fond" />
      <Nav />
      <main>
        <section className="conteneur hero">
          <div className="sur-titre">Jeu de société à secrets</div>
          <h1>Ravensburg</h1>
          <p>
            Chaque nuit, une fenêtre s’illumine au sommet du château Corvin. Une console au centre de la table, un téléphone
            par joueur, et un village où personne n’est tout à fait ce qu’il prétend être.
          </p>
          <div className="actions">
            <Link href="/console" className="btn btn-or btn-grand">Créer une partie</Link>
            <Link href="/jouer" className="btn btn-grand">Rejoindre avec un code</Link>
          </div>
        </section>

        <section id="jeux" className="conteneur section">
          <div className="etiquette">Les jeux</div>
          <h2>Une plateforme, plusieurs mystères</h2>
          <div className="grille-jeux">
            {jeux.map((j) => (
              <article key={j.code} className="panneau carte-jeu">
                <div className="visuel" style={{ backgroundImage: `url(${j.visuel})` }}>
                  <span className="badge badge-ok">Jouable</span>
                </div>
                <div className="corps">
                  <h3>{j.nom}</h3>
                  <p>{j.description}</p>
                  <div>
                    <span className="puce">{j.joueurs.min}–{j.joueurs.max} joueurs</span>
                    <span className="puce">~{j.dureeMinutes} min</span>
                    <span className="puce">{j.modes.length} modes</span>
                  </div>
                  <Link href="/console" className="btn btn-or">Jouer à {j.nom}</Link>
                </div>
              </article>
            ))}
            <article className="panneau carte-jeu">
              <div className="visuel" style={{ backgroundImage: 'linear-gradient(135deg,#1b1f2b,#0d0f14)' }}>
                <span className="badge badge-bientot">En construction</span>
              </div>
              <div className="corps">
                <h3>Meurtre au manoir</h3>
                <p>Enquête et déduction : vos cartes en secret sur le téléphone, le plan du manoir sur la console.</p>
                <div><span className="puce">3–6 joueurs</span><span className="puce">~60 min</span></div>
                <button className="btn" disabled>Bientôt</button>
              </div>
            </article>
          </div>
        </section>

        <section id="comment" className="conteneur section">
          <div className="etiquette">Comment jouer</div>
          <h2>Prêt en trente secondes</h2>
          <div className="etapes">
            <div className="etape panneau"><h3>Ouvre la console</h3><p>Sur la télé ou l’ordinateur, crée une partie et choisis un mode : classique, équilibré, nouveautés ou chaos.</p></div>
            <div className="etape panneau"><h3>Scannez le code</h3><p>Chaque joueur scanne le QR code avec son téléphone et choisit un pseudo. Rien à installer.</p></div>
            <div className="etape panneau"><h3>Reçois ton rôle</h3><p>Ta carte reste secrète sur ton écran. La nuit, ton téléphone te dit quand agir.</p></div>
            <div className="etape panneau"><h3>Débattez, votez</h3><p>La console raconte la nuit et anime le village. Seuls les vivants parlent.</p></div>
          </div>
        </section>

        <section className="conteneur section">
          <div className="etiquette">Le grimoire</div>
          <h2>Vingt-neuf destins, jamais deux fois la même table</h2>
          <p style={{ color: 'var(--doux)', maxWidth: 700 }}>
            Les loups ne sont plus les seuls à rôder : Dracula corrompt en silence, le Joueur de flûte enchante, le Corbeau accuse.
            Les rôles sont tirés au hasard selon le nombre de joueurs, avec un budget d’équilibre et un effet « nouveautés ».
          </p>
          <div className="defilement">
            {VITRINE.map((c) => <CarteRole key={c} code={c} />)}
          </div>
          <Link href="/roles" className="btn">Voir tous les rôles</Link>
        </section>
      </main>
      <footer className="conteneur pied">Ravensburg · jeux de société à secrets · une console, des téléphones</footer>
    </>
  );
}
