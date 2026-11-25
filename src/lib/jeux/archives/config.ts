import { z } from 'zod';

export const configSchema = z.object({
  dureeTourSecondes: z.number().int().min(20).max(300).default(90),
  dureeReponseSecondes: z.number().int().min(15).max(120).default(45),
  /** Nombre de manches (un tour de table) avant que les Archives ne se referment. */
  toursMax: z.number().int().min(4).max(80).default(40),
  pas: z.number().int().min(2).max(6).default(3),
  narrationVocale: z.boolean().default(true),
});
export type Config = z.infer<typeof configSchema>;
