import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  deleteDoc,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // Simplified for now, in a real app we'd grab more details
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export const albumService = {
  async saveUserProfile(userId: string, profile: { displayName: string | null, email: string | null, photoURL: string | null }) {
    try {
      const normalizedName = profile.displayName ? normalizeString(profile.displayName) : '';
      await setDoc(doc(db, 'users', userId), {
        ...profile,
        normalizedName,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
    }
  },

  async searchUsers(queryText: string) {
    const normalizedQuery = normalizeString(queryText);
    if (!normalizedQuery) return [];
    
    const q = query(
      collection(db, 'users'), 
      where('normalizedName', '>=', normalizedQuery), 
      where('normalizedName', '<=', normalizedQuery + '\uf8ff')
    );
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users');
    }
  },

  async getAlbumInventory(albumId: string) {
    const path = `albums/${albumId}/inventory`;
    try {
      const snapshot = await getDocs(collection(db, path));
      const inventory: Record<string, any> = {};
      snapshot.forEach(doc => {
        inventory[doc.id] = doc.data();
      });
      return inventory;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async addFriend(userId: string, friendId: string) {
    try {
      await setDoc(doc(db, 'users', userId, 'friends', friendId), {
        addedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}/friends/${friendId}`);
    }
  },

  async removeFriend(userId: string, friendId: string) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'friends', friendId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}/friends/${friendId}`);
    }
  },

  async getFriends(userId: string) {
    try {
      const snapshot = await getDocs(collection(db, 'users', userId, 'friends'));
      const friends: string[] = [];
      snapshot.forEach(doc => friends.push(doc.id));
      return friends;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, `users/${userId}/friends`);
    }
  },

  async getUsersByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    const q = query(collection(db, 'users'), where('__name__', 'in', userIds));
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users');
    }
  },

  async getGlobalRanking() {
    try {
      // Try ordered query first
      const q = query(
        collection(db, 'users'), 
        orderBy('stats.completionPercentage', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      
      // If we got results, perfect
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Fallback: Just get some users and sort manually if the field is missing/new
      const fallbackQ = query(collection(db, 'users'), limit(50));
      const fallbackSnap = await getDocs(fallbackQ);
      return fallbackSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.stats && u.stats.completionPercentage !== undefined)
        .sort((a: any, b: any) => (b.stats?.completionPercentage || 0) - (a.stats?.completionPercentage || 0))
        .slice(0, 20);
        
    } catch (e) {
      console.error("Ranking query failed, attempting simple fetch:", e);
      try {
        const simpleSnap = await getDocs(query(collection(db, 'users'), limit(20)));
        return simpleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error("All ranking attempts failed:", err);
        return [];
      }
    }
  },

  async updateUserStats(userId: string, completionPercentage: number) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        'stats.completionPercentage': completionPercentage,
        updatedAt: serverTimestamp()
      });
      // Check for badges after updating stats
      await this.checkAndAwardBadges(userId, completionPercentage);
    } catch (e) {
      // It's possible the doc doesn't have the stats object yet, so we use setDoc with merge instead
      await setDoc(doc(db, 'users', userId), {
        stats: { completionPercentage },
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  },

  async checkAndAwardBadges(userId: string, percentage: number) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      const currentBadges = userData.badges || [];
      const newBadges = [...currentBadges];
      
      if (percentage >= 10 && !currentBadges.includes('principiante')) newBadges.push('principiante');
      if (percentage >= 50 && !currentBadges.includes('coleccionista')) newBadges.push('coleccionista');
      if (percentage >= 90 && !currentBadges.includes('casi_completo')) newBadges.push('casi_completo');
      if (percentage === 100 && !currentBadges.includes('leyenda')) newBadges.push('leyenda');
      
      if (newBadges.length > currentBadges.length) {
        await updateDoc(doc(db, 'users', userId), { badges: newBadges });
      }
    } catch (e) {
      console.error("Error awarding badges", e);
    }
  },

  async sendMessage(msg: any) {
    try {
      await addDoc(collection(db, 'messages'), {
        ...msg,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'messages');
    }
  },

  subscribeToMessages(userId: string, callback: (msgs: any[]) => void) {
    // We need two queries because Firestore doesn't support 'OR' across different fields well in simple subscriptions without composite indexes
    const q1 = query(collection(db, 'messages'), where('from', '==', userId));
    const q2 = query(collection(db, 'messages'), where('to', '==', userId));
    
    let msgs1: any[] = [];
    let msgs2: any[] = [];

    const handleUpdate = () => {
      const all = [...msgs1, ...msgs2].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(all);
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      msgs1 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      handleUpdate();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      msgs2 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      handleUpdate();
    });

    return () => {
      unsub1();
      unsub2();
    };
  },

  async completeSwap(messageId: string, fromId: string, toId: string, give: string[], get: string[]) {
    try {
      // 1. Mark message as completed
      await updateDoc(doc(db, 'messages', messageId), { status: 'completed' });

      // Update completed swaps count for both
      await setDoc(doc(db, 'users', fromId), { 
        stats: { completedSwaps: increment(1) } 
      }, { merge: true });
      await setDoc(doc(db, 'users', toId), { 
        stats: { completedSwaps: increment(1) } 
      }, { merge: true });

      // 2. We need to update inventories. 
      // This is a complex operation that usually requires a Cloud Function for atomicity across different users' documents.
      // But for this client-side demo, we'll perform multiple batch-like setDocs/updateDocs.
      
      // Update my inventory (toId is the receiver - the person who clicks "Complete")
      const myAlbums = await this.getAlbums(toId);
      if (myAlbums && myAlbums.length > 0) {
        const myAlbumId = myAlbums[0].id;
        
        // As Receiver, I GET what they sent in 'give'
        for (const code of give) {
          await this.updateSticker(myAlbumId, code, 'obtained', 1);
        }
        
        // As Receiver, I GIVE what was in 'get' (my own repeated stickers)
        const myInv = await this.getAlbumInventory(myAlbumId);
        for (const code of get) {
          const current = myInv[code];
          if (current && current.status === 'repeated' && current.count > 0) {
            const nextCount = current.count - 1;
            const nextStatus = nextCount === 0 ? 'obtained' : (nextCount === 1 ? 'obtained' : 'repeated');
            await this.updateSticker(myAlbumId, code, nextStatus, nextCount);
          }
        }
      }

      // Update friend's inventory (fromId - the sender)
      const friendAlbums = await this.getAlbums(fromId);
      if (friendAlbums && friendAlbums.length > 0) {
        const friendAlbumId = friendAlbums[0].id;

        // As Sender, they GET what I sent in 'get'
        for (const code of get) {
          await this.updateSticker(friendAlbumId, code, 'obtained', 1);
        }

        // As Sender, they GIVE what was in 'give' (their repeated stickers)
        const friendInv = await this.getAlbumInventory(friendAlbumId);
        for (const code of give) {
          const current = friendInv[code];
          if (current && current.status === 'repeated' && current.count > 0) {
            const nextCount = current.count - 1;
            const nextStatus = nextCount === 0 ? 'obtained' : (nextCount === 1 ? 'obtained' : 'repeated');
            await this.updateSticker(friendAlbumId, code, nextStatus, nextCount);
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `messages/${messageId}`);
    }
  },

  async getAlbums(userId: string) {
    const q = query(collection(db, 'albums'), where('userId', '==', userId));
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'albums');
    }
  },

  async createAlbum(userId: string, name: string) {
    try {
      const docRef = await addDoc(collection(db, 'albums'), {
        userId,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'albums');
    }
  },

  async deleteAlbum(albumId: string) {
    try {
      await deleteDoc(doc(db, 'albums', albumId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `albums/${albumId}`);
    }
  },

  subscribeToInventory(albumId: string, callback: (data: Record<string, any>) => void) {
    const path = `albums/${albumId}/inventory`;
    return onSnapshot(collection(db, path), (snapshot) => {
      const inventory: Record<string, any> = {};
      snapshot.forEach(doc => {
        inventory[doc.id] = doc.data();
      });
      callback(inventory);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async updateSticker(albumId: string, stickerCode: string, status: string, count: number) {
    const path = `albums/${albumId}/inventory/${stickerCode}`;
    try {
      await setDoc(doc(db, 'albums', albumId, 'inventory', stickerCode), {
        status,
        count,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
};
