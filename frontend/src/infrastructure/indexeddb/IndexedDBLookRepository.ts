import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { LookRepositoryPort } from '../../application/ports';
import type { SavedLook } from '../../domain/models';

const DB_NAME = 'fashion-pal-db';
const DB_VERSION = 1;
const STORE_SAVED_LOOKS = 'saved_looks';

interface FashionPalDB extends DBSchema {
  saved_looks: {
    key: string;
    value: SavedLook;
    indexes: { 'by-saved-at': string };
  };
}

export class IndexedDBLookRepository implements LookRepositoryPort {
  private dbPromise: Promise<IDBPDatabase<FashionPalDB>> | null = null;

  private getDB(): Promise<IDBPDatabase<FashionPalDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<FashionPalDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_SAVED_LOOKS)) {
            const store = db.createObjectStore(STORE_SAVED_LOOKS, {
              keyPath: 'id',
            });
            store.createIndex('by-saved-at', 'saved_at');
          }
          // v0.0.2+ will add 'wardrobe_items' & 'garment_blobs' stores in version 2
        },
      });
    }
    return this.dbPromise;
  }

  async listLooks(): Promise<SavedLook[]> {
    const db = await this.getDB();
    return db.getAll(STORE_SAVED_LOOKS);
  }

  async saveLook(look: SavedLook): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_SAVED_LOOKS, look);
  }

  async deleteLook(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(STORE_SAVED_LOOKS, id);
  }
}
