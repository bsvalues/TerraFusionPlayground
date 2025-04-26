/**
 * Realm Adapter for Yjs Persistence
 * 
 * Provides methods to save and load Yjs documents from Realm database
 */

import Realm from "realm";
import * as Y from "yjs";

/**
 * PropertyDoc schema for Realm
 */
const PropertySchema = {
  name: "PropertyDoc",
  primaryKey: "id",
  properties: {
    id: "string",
    ydoc: "data",       // binary Yjs snapshot
    updatedAt: "date",
  },
};

/**
 * Global realm instance
 */
let realm: Realm | null = null;

/**
 * Get or initialize the Realm instance
 * 
 * @returns Initialized Realm instance
 */
export async function getRealm() {
  if (!realm) {
    realm = await Realm.open({
      schema: [PropertySchema],
      schemaVersion: 1,
    });
  }
  return realm;
}

/**
 * Save a Yjs document to Realm
 * 
 * @param id Document ID
 * @param ydoc Yjs document to save
 */
export async function saveYDoc(id: string, ydoc: Y.Doc) {
  const db = await getRealm();
  const blob = Y.encodeStateAsUpdate(ydoc);
  
  db.write(() => {
    db.create(
      "PropertyDoc", 
      { 
        id, 
        ydoc: blob, 
        updatedAt: new Date() 
      }, 
      Realm.UpdateMode.Modified
    );
  });
}

/**
 * Load a Yjs document from Realm
 * 
 * @param id Document ID to load
 * @returns Yjs document binary representation or null if not found
 */
export async function loadYDoc(id: string): Promise<Uint8Array | null> {
  const db = await getRealm();
  const rec = db.objectForPrimaryKey("PropertyDoc", id);
  return rec ? (rec.ydoc as unknown as Uint8Array) : null;
}

/**
 * Close the Realm instance
 */
export function closeRealm() {
  if (realm) {
    realm.close();
    realm = null;
  }
}