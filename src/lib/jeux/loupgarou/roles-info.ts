/** Textes affichés sur les téléphones et dans le grimoire (/roles). */
export interface RoleInfo { emoji: string; resume: string }

export const ROLES_INFO: Record<string, RoleInfo> = {
  villageois: { emoji: '🧑‍🌾', resume: 'Aucun pouvoir, mais ta voix compte. Observe, débats, vote.' },
  loup_garou: { emoji: '🐺', resume: 'Chaque nuit, la meute dévore un habitant. Reste discret le jour.' },
  voyante: { emoji: '🔮', resume: 'Chaque nuit, découvre le véritable rôle d’un joueur.' },
  medium: { emoji: '🕯️', resume: 'Une fois dans la partie, interroge un défunt : tu apprends son rôle.' },
  petite_fille: { emoji: '👧', resume: 'Tu captes des fragments du chat des loups, mais à moitié effacés.' },
  renard: { emoji: '🦊', resume: 'Flaire un joueur et ses deux voisins : y a-t-il un loup parmi eux ? Sans loup, ton flair s’éteint.' },
  montreur_ours: { emoji: '🐻', resume: 'Chaque matin, ton ours grogne si l’un de tes voisins vivants est un loup.' },
  corbeau: { emoji: '🐦‍⬛', resume: 'Chaque nuit, désigne un joueur : il aura 2 votes contre lui au prochain vote.' },
  juge: { emoji: '⚖️', resume: 'Une fois, impose un second vote le jour même.' },
  salvateur: { emoji: '🛡️', resume: 'Chaque nuit, protège un joueur des loups. Jamais le même deux nuits de suite.' },
  ancien: { emoji: '🧙‍♂️', resume: 'Tu survis à la première attaque des loups.' },
  idiot: { emoji: '🤪', resume: 'Si le village te vote, tu es gracié… mais tu perds ton droit de vote.' },
  bouc_emissaire: { emoji: '🐐', resume: 'En cas d’égalité au vote, c’est toi qui meurs.' },
  aubergiste: { emoji: '🍺', resume: 'Héberge un joueur : intouchable cette nuit, mais il ne peut pas agir.' },
  servante: { emoji: '🧹', resume: 'Après une mort, tu peux prendre le rôle du défunt.' },
  cupidon: { emoji: '💘', resume: 'Nuit 1 : lie deux amoureux. Si l’un meurt, l’autre le suit.' },
  sorciere: { emoji: '🧪', resume: 'Une potion de vie, une potion de mort. Tu vois les victimes de la nuit.' },
  chasseur: { emoji: '🏹', resume: 'Si tu meurs, tu emportes quelqu’un avec toi.' },
  comedien: { emoji: '🎭', resume: 'Tu reçois 3 pouvoirs au hasard : un par nuit, une fois chacun.' },
  loup_blanc: { emoji: '🐺', resume: 'Loup solitaire : une nuit sur deux, tu peux dévorer un des tiens. Tu gagnes seul.' },
  infect: { emoji: '☣️', resume: 'Une fois, infecte la victime des loups : elle rejoint la meute au lieu de mourir.' },
  grand_mechant_loup: { emoji: '🐺', resume: 'Tant qu’aucun loup n’est mort, la meute fait une seconde victime.' },
  joueur_flute: { emoji: '🪈', resume: 'Enchante 2 joueurs par nuit. Tu gagnes quand tous les vivants sont enchantés.' },
  pyromane: { emoji: '🔥', resume: 'Asperge des joueurs, puis embrase-les tous d’un coup. Dernier survivant, tu gagnes.' },
  voleur: { emoji: '🗝️', resume: 'Nuit 1 : échange ton rôle contre l’une des deux cartes posées au centre.' },
  enfant_sauvage: { emoji: '🧒', resume: 'Choisis un modèle : s’il meurt, tu deviens Loup-garou.' },
  ange: { emoji: '😇', resume: 'Tu gagnes seul si le village t’élimine au tout premier vote.' },
  chien_loup: { emoji: '🐕', resume: 'Nuit 1 : choisis ton camp, village ou loups.' },
  dracula: {
    emoji: '🧛',
    resume: 'Chaque nuit, pose une Marque vampirique secrète. Après plusieurs marques, la victime te sert, en gardant son identité et ses pouvoirs.',
  },
};

export const CAMPS: Record<string, string> = { village: 'Village', loups: 'Loups-garous', solo: 'Solitaire' };

/** Cartes illustrées disponibles dans /public/ravensburg/cartes (les autres rôles ont une carte "grimoire" générée). */
export const CARTES_ILLUSTREES = new Set(["ancien", "ange", "aubergiste", "bouc_emissaire", "chasseur", "corbeau", "cupidon", "enfant_sauvage", "idiot", "joueur_flute", "loup_blanc", "loup_garou", "montreur_ours", "petite_fille", "pyromane", "renard", "salvateur", "sorciere", "villageois", "voleur", "voyante"]);
