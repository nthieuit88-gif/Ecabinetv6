import { openDB, DBSchema } from 'idb';

interface ECabinetDB extends DBSchema {
  documents: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      timestamp: number;
    };
  };
}

const DB_NAME = 'ecabinet-storage';
const STORE_NAME = 'documents';

// Initialize DB
const initDB = async () => {
  return openDB<ECabinetDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

// Save file to IndexedDB
export const saveFileToLocal = async (id: string, file: Blob | File) => {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, {
      id,
      blob: file,
      timestamp: Date.now(),
    });
    console.log(`[IndexedDB] Saved file ${id} locally.`);
    return true;
  } catch (error) {
    console.error('[IndexedDB] Error saving file:', error);
    return false;
  }
};

// Get file from IndexedDB
export const getFileFromLocal = async (id: string): Promise<Blob | null> => {
  try {
    const db = await initDB();
    const data = await db.get(STORE_NAME, id);
    return data ? data.blob : null;
  } catch (error) {
    console.error('[IndexedDB] Error retrieving file:', error);
    return null;
  }
};

// Delete file from IndexedDB
export const deleteFileFromLocal = async (id: string) => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
    console.log(`[IndexedDB] Deleted file ${id} locally.`);
  } catch (error) {
    console.error('[IndexedDB] Error deleting file:', error);
  }
};

// Clear all files
export const clearAllLocalFiles = async () => {
    try {
        const db = await initDB();
        await db.clear(STORE_NAME);
    } catch (error) {
        console.error('[IndexedDB] Error clearing DB:', error);
    }
}
