import { integer, jsonb, pgTable } from 'drizzle-orm/pg-core';

// The live game (scores, open tile, screen view) as one row, id = 1.
export const liveGameTable = pgTable('live_game', {
  id: integer('id').primaryKey(),
  state: jsonb('state').notNull(),
});

// The host's game setup (questions, teams, rounds, media) as one row, id = 1.
export const gameConfigTable = pgTable('game_config', {
  id: integer('id').primaryKey(),
  config: jsonb('config').notNull(),
});
