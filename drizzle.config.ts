import { defineConfig } from 'drizzle-kit';

// After changing src/db/schema.ts run `npm run db:generate` to create a new migration.
// Migrations run automatically when the app starts, so existing data is kept.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
