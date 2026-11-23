import Link from 'next/link';

export function Nav() {
  return (
    <header className="conteneur nav">
      <Link href="/" className="marque">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icones/icone-192.png" alt="" width={34} height={34} />
        Ravensburg
      </Link>
      <nav className="nav-liens">
        <Link href="/#jeux" className="cache-mobile">Jeux</Link>
        <Link href="/#comment" className="cache-mobile">Comment jouer</Link>
        <Link href="/roles">Rôles</Link>
        <Link href="/jouer" className="btn">Rejoindre</Link>
      </nav>
    </header>
  );
}
