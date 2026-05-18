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
import { linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { BillingPlugin } from 'capacitor-billing';
import { db, auth } from './firebase';

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
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email
      })) || []
    },
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
  async saveUserProfile(userId: string, profile: any) {
    try {
      const normalizedName = profile.displayName ? normalizeString(profile.displayName) : undefined;
      await setDoc(doc(db, 'users', userId), {
        ...profile,
        ...(normalizedName ? { normalizedName } : {}),
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
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Mark message as completed
      batch.update(doc(db, 'messages', messageId), { status: 'completed' });

      // Update completed swaps count for both using dot notation to avoid clobbering other stats
      batch.update(doc(db, 'users', fromId), { 
        'stats.completedSwaps': increment(1),
        updatedAt: serverTimestamp()
      });
      batch.update(doc(db, 'users', toId), { 
        'stats.completedSwaps': increment(1),
        updatedAt: serverTimestamp()
      });

      // 2. Update inventories
      const myAlbums = await this.getAlbums(toId);
      if (myAlbums && myAlbums.length > 0) {
        const myAlbumId = myAlbums[0].id;
        const myInv = await this.getAlbumInventory(myAlbumId);
        
        // As Receiver, I GET what they sent in 'give'
        for (const code of give) {
          batch.set(doc(db, 'albums', myAlbumId, 'inventory', code), {
            status: 'obtained',
            count: 1,
            updatedAt: serverTimestamp()
          });
        }
        
        // As Receiver, I GIVE what was in 'get'
        for (const code of get) {
          const current = myInv[code];
          if (current && current.status === 'repeated' && current.count > 0) {
            const nextCount = current.count - 1;
            const nextStatus = nextCount === 1 ? 'obtained' : 'repeated';
            batch.set(doc(db, 'albums', myAlbumId, 'inventory', code), {
              status: nextStatus,
              count: nextCount,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      // Update friend's inventory
      const friendAlbums = await this.getAlbums(fromId);
      if (friendAlbums && friendAlbums.length > 0) {
        const friendAlbumId = friendAlbums[0].id;
        const friendInv = await this.getAlbumInventory(friendAlbumId);

        // As Sender, they GET what I sent in 'get'
        for (const code of get) {
          batch.set(doc(db, 'albums', friendAlbumId, 'inventory', code), {
            status: 'obtained',
            count: 1,
            updatedAt: serverTimestamp()
          });
        }

        // As Sender, they GIVE what was in 'give'
        for (const code of give) {
          const current = friendInv[code];
          if (current && current.status === 'repeated' && current.count > 0) {
            const nextCount = current.count - 1;
            const nextStatus = nextCount === 1 ? 'obtained' : 'repeated';
            batch.set(doc(db, 'albums', friendAlbumId, 'inventory', code), {
              status: nextStatus,
              count: nextCount,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await batch.commit();
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
  },

  async linkGoogleAccount() {
    try {
      if (!auth.currentUser) throw new Error("No user logged in");
      
      const provider = new GoogleAuthProvider();
      // Ensure only email and profile (minimal scopes)
      // Standard GoogleAuthProvider already handles this, but we can be explicit if needed.
      
      try {
        await linkWithPopup(auth.currentUser, provider);
      } catch (linkError: any) {
        if (linkError.code !== 'auth/provider-already-linked') {
          throw linkError;
        }
      }
      return true;
    } catch (e) {
      console.error("Error linking Google account:", e);
      throw e;
    }
  },

  async restorePurchases(userId: string) {
    try {
      // Use BillingPlugin to query purchases
      const { purchases } = await (BillingPlugin as any).queryPurchases({ type: 'inapp' });
      
      const premiumSKU = 'premium_upgrade_2026';
      const hasPremium = (purchases || []).some((p: any) => p.productId === premiumSKU);
      
      if (hasPremium) {
        await this.saveUserProfile(userId, { isPremium: true });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error restoring purchases:", e);
      return false;
    }
  },

  async getGlobalSettings() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return {
        googleLoginEnabled: true,
        passwordChangeEnabled: true
      };
    } catch (e) {
      console.error("Error fetching global settings:", e);
      return {
        googleLoginEnabled: true,
        passwordChangeEnabled: true
      };
    }
  },

  async updateGlobalSettings(settings: { googleLoginEnabled?: boolean, passwordChangeEnabled?: boolean }) {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global');
    }
  }
};
