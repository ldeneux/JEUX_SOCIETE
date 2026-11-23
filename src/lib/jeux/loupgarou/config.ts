import { z } from 'zod';

export const configSchema = z.object({
  dureeDiscussionSecondes: z.number().int().min(30).max(900).default(180),
  dureeActionNuitSecondes: z.number().int().min(10).max(120).default(30),
  dureeVoteSecondes: z.number().int().min(15).max(300).default(60),
  dureeDecisionSecondes: z.number().int().min(10).max(120).default(30),
  /** Durée d'un réveil "factice" (rôle mort ou absent) : évite de trahir les rôles par le rythme. */
  leurreSecondes: z.number().int().min(0).max(30).default(6),
  annonceSecondes: z.number().int().min(0).max(30).default(8),
  maire: z.boolean().default(true),
  /** Dracula : nombre de Marques vampiriques avant corruption. */
  marquesPourCorruption: z.number().int().min(1).max(4).default(2),
  /** Dracula gagne aussi s'il reste le dernier pouvoir occulte (plus de loups ni de solos). */
  draculaDernierPouvoir: z.boolean().default(true),
  votePublic: z.boolean().default(true),
  narrationVocale: z.boolean().default(true),
  reveleRoleDesMorts: z.boolean().default(true),
  rolesImposes: z.array(z.string()).optional(), // mode 'personnalise'
  /** Injecté par la route serveur depuis loupgarou_fraicheur. */
  fraicheur: z.record(z.string(), z.number()).optional(),
});

export type Config = z.infer<typeof configSchema>;
