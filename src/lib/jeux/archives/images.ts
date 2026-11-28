/** Chemins des illustrations (public/archives/…). Un seul endroit : les fichiers ont des noms propres à l'illustratrice. */
const ARTEFACTS: Record<string, string> = {
  sceptre: 'sceptre_pharaons', cristal: 'cristal_maya', couronne: 'couronne_imperiale', boussole: 'boussole_temporelle', cle: 'cle_babylone',
  fragment: 'fragment_atlantide', calice: 'calice_camelot', perle: 'perle_abysses', sceau: 'sceau_dragon', disque: 'disque_solaire',
};
const LIEUX: Record<string, string> = {
  eiffel: '01_Tour_Eiffel', colisee: '02_Colisee_de_Rome', pyramides: '03_Pyramides_de_Gizeh', chichen: '01_Chichen_Itza', muraille: '04_Grande_Muraille',
  taj: '05_Taj_Mahal', petra: '06_Petra', machu: '07_Machu_Picchu', atlantide: '08_Atlantide', angkor: 'angkor_wat', stonehenge: 'stonehenge',
  alexandrie: 'bibliotheque_alexandrie', bigben: '02_Big_Ben', liberte: '03_Statue_de_la_Liberte', moai: '06_Moai', torii: '05_Torii_de_Miyajima', opera: '04_Opera_de_Sydney',
};
const MOBILES: Record<string, string> = {
  avarice: '09_Appat_du_Gain', pouvoir: '10_Recherche_du_Pouvoir', vengeance: '11_Vengeance', protection: '12_Protection_de_l_Histoire',
  catastrophe: '13_Empecher_une_Catastrophe_Temporelle', falsification: '14_Falsification_du_Passe', immortalite: 'quete_immortalite',
  proche: 'sauver_proche', modifier: 'modifier_passe', sabotage: 'sabotage_archives',
};

export const imgPerso = (code: string) => `/archives/persos/${code}.webp`;
export const imgArtefact = (id: string) => `/archives/artefacts/${ARTEFACTS[id] ?? id}.webp`;
export const imgLieu = (id: string) => `/archives/lieux/${LIEUX[id] ?? id}.webp`;
export const imgMobile = (id: string) => `/archives/motifs/${MOBILES[id] ?? id}.webp`;
export const imgPnj = (code: string) => `/archives/pnj/${code}.webp`;
export const imgCarte = (cat: string, id: string) =>
  cat === 'suspect' ? imgPerso(id) : cat === 'artefact' ? imgArtefact(id) : cat === 'lieu' ? imgLieu(id) : imgMobile(id);
