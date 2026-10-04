import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// All data lives in this one file on the phone. enableChangeListener lets
// useLiveQuery re-render screens when rows change.
export const sqlite = openDatabaseSync('headroom.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
