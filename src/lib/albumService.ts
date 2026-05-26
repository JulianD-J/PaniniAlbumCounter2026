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
  increment,
  writeBatch
} from 'firebase/firestore';
import { linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { BillingPlugin } from 'capacitor-billing';
import { Capacitor } from '@capacitor/core';
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
    const docRef = doc(db, 'albums', albumId);
    try {
      const docSnap = await getDoc(docRef);
      const inventory: Record<string, any> = {};
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dbInventory = data.inventory || {};
        Object.keys(dbInventory).forEach(code => {
          const item = dbInventory[code] || {};
          const qty = typeof item.quantity === 'number' ? item.quantity : (item.count || 0);
          const active = typeof item.isConseguida === 'boolean' ? item.isConseguida : (qty > 0);
          
          let statusStr = 'missing';
          if (active) {
            statusStr = qty > 1 ? 'repeated' : 'obtained';
          }

          inventory[code] = {
            quantity: qty,
            isConseguida: active,
            count: qty,
            status: statusStr,
            updatedAt: item.updatedAt
          };
        });
      }
      return inventory;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `albums/${albumId}`);
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
        
        const myAlbumRef = doc(db, 'albums', myAlbumId);
        const myUpdates: Record<string, any> = {
          updatedAt: serverTimestamp()
        };

        // As Receiver, I GET what they sent in 'give'
        for (const code of give) {
          myUpdates[`inventory.${code}.quantity`] = 1;
          myUpdates[`inventory.${code}.isConseguida`] = true;
          myUpdates[`inventory.${code}.updatedAt`] = serverTimestamp();
        }
        
        // As Receiver, I GIVE what was in 'get'
        for (const code of get) {
          const current = myInv[code];
          if (current && current.status === 'repeated' && current.count > 0) {
            const nextCount = current.count - 1;
            myUpdates[`inventory.${code}.quantity`] = nextCount;
            myUpdates[`inventory.${code}.isConseguida`] = true;
            myUpdates[`inventory.${code}.updatedAt`] = serverTimestamp();
          }
        }

        if (Object.keys(myUpdates).length > 1) {
          batch.update(myAlbumRef, myUpdates);
        }
      }

      // Update friend's inventory
      const friendAlbums = await this.getAlbums(fromId);
      if (friendAlbums && friendAlbums.length > 0) {
        const friendAlbumId = friendAlbums[0].id;
        const friendInv = await this.getAlbumInventory(friendAlbumId);

        const friendAlbumRef = doc(db, 'albums', friendAlbumId);
        const friendUpdates: Record<string, any> = {
          updatedAt: serverTimestamp()
        };

        // As Sender, they GET what I sent in 'get'
        for (const code of get) {
          friendUpdates[`inventory.${code}.quantity`] = 1;
          friendUpdates[`inventory.${code}.isConseguida`] = true;
          friendUpdates[`inventory.${code}.updatedAt`] = serverTimestamp();
        }

        // As Sender, they GIVE what was in 'give'
        for (const code of give) {
          const current = friendInv[code];
          if (current && current.status === 'repeated' && current.count > 0) {
            const nextCount = current.count - 1;
            friendUpdates[`inventory.${code}.quantity`] = nextCount;
            friendUpdates[`inventory.${code}.isConseguida`] = true;
            friendUpdates[`inventory.${code}.updatedAt`] = serverTimestamp();
          }
        }

        if (Object.keys(friendUpdates).length > 1) {
          batch.update(friendAlbumRef, friendUpdates);
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

  async createAlbum(userId: string, name: string, isInverseMode: boolean = false, cocaColaCount: number = 14) {
    try {
      const docRef = await addDoc(collection(db, 'albums'), {
        userId,
        name,
        isInverseMode: false,
        cocaColaCount,
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

  async updateAlbumName(albumId: string, name: string) {
    try {
      await updateDoc(doc(db, 'albums', albumId), {
        name,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `albums/${albumId}`);
    }
  },

  subscribeToInventory(albumId: string, callback: (data: Record<string, any>) => void) {
    const docRef = doc(db, 'albums', albumId);
    return onSnapshot(docRef, (docSnap) => {
      const inventory: Record<string, any> = {};
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dbInventory = data.inventory || {};
        Object.keys(dbInventory).forEach(code => {
          const item = dbInventory[code] || {};
          const qty = typeof item.quantity === 'number' ? item.quantity : (item.count || 0);
          const active = typeof item.isConseguida === 'boolean' ? item.isConseguida : (qty > 0);
          
          let statusStr = 'missing';
          if (active) {
            statusStr = qty > 1 ? 'repeated' : 'obtained';
          }

          inventory[code] = {
            quantity: qty,
            isConseguida: active,
            count: qty,
            status: statusStr,
            updatedAt: item.updatedAt
          };
        });
      }
      callback(inventory);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `albums/${albumId}`);
    });
  },

  async updateSticker(albumId: string, stickerCode: string, status: string, count: number) {
    const docRef = doc(db, 'albums', albumId);
    try {
      const isConseguida = status !== 'missing' && count > 0;
      const quantity = isConseguida ? count : 0;

      const updateData: Record<string, any> = {
        [`inventory.${stickerCode}.quantity`]: quantity,
        [`inventory.${stickerCode}.isConseguida`]: isConseguida,
        [`inventory.${stickerCode}.updatedAt`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `albums/${albumId}`);
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
      if (!Capacitor.isNativePlatform()) {
        throw new Error("La restauración de compras de Google Play solo está disponible en la aplicación Android.");
      }
      // Use BillingPlugin to query purchases
      const { purchases } = await (BillingPlugin as any).queryPurchases({ type: 'inapp' });
      
      const premiumSKU = 'premium_upgrade_permanent';
      const hasPremium = (purchases || []).some((p: any) => p.productId === premiumSKU);
      
      if (hasPremium) {
        await this.saveUserProfile(userId, { 
          isPremium: true,
          restoredAt: serverTimestamp(),
          sku: premiumSKU
        });
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
        const data = docSnap.data();
        return {
          googleLoginEnabled: data.googleLoginEnabled !== false,
          passwordChangeEnabled: data.passwordChangeEnabled !== false,
          announcementEnabled: !!data.announcementEnabled,
          announcementText: data.announcementText || "",
          maintenanceModeEnabled: !!data.maintenanceModeEnabled
        };
      }
      return {
        googleLoginEnabled: true,
        passwordChangeEnabled: true,
        announcementEnabled: false,
        announcementText: "",
        maintenanceModeEnabled: false
      };
    } catch (e) {
      console.error("Error fetching global settings:", e);
      return {
        googleLoginEnabled: true,
        passwordChangeEnabled: true,
        announcementEnabled: false,
        announcementText: "",
        maintenanceModeEnabled: false
      };
    }
  },

  async updateGlobalSettings(settings: { 
    googleLoginEnabled?: boolean; 
    passwordChangeEnabled?: boolean;
    announcementEnabled?: boolean;
    announcementText?: string;
    maintenanceModeEnabled?: boolean;
  }) {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global');
    }
  },

  async transferSticker(fromAlbumId: string, toAlbumId: string, stickerCode: string) {
    try {
      const fromAlbumRef = doc(db, 'albums', fromAlbumId);
      const toAlbumRef = doc(db, 'albums', toAlbumId);

      const fromAlbumSnap = await getDoc(fromAlbumRef);
      const toAlbumSnap = await getDoc(toAlbumRef);

      if (!fromAlbumSnap.exists()) {
        throw new Error("Source album does not exist");
      }
      if (!toAlbumSnap.exists()) {
        throw new Error("Target album does not exist");
      }

      const fromData = fromAlbumSnap.data();
      const toData = toAlbumSnap.data();

      const fromInv = fromData.inventory || {};
      const toInv = toData.inventory || {};

      const currentFrom = fromInv[stickerCode];
      const fromQty = currentFrom?.quantity || 0;
      const fromActive = currentFrom?.isConseguida || false;

      if (!fromActive || fromQty <= 1) {
        throw new Error("No repeated sticker to transfer");
      }

      const batch = writeBatch(db);

      // Update source (decrement)
      const nextFromQty = fromQty - 1;
      const nextFromActive = nextFromQty > 0;
      batch.update(fromAlbumRef, {
        [`inventory.${stickerCode}.quantity`]: nextFromQty,
        [`inventory.${stickerCode}.isConseguida`]: nextFromActive,
        [`inventory.${stickerCode}.updatedAt`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update target (increment)
      const currentTo = toInv[stickerCode];
      const toQty = currentTo?.quantity || 0;
      const nextToQty = toQty + 1;
      
      batch.update(toAlbumRef, {
        [`inventory.${stickerCode}.quantity`]: nextToQty,
        [`inventory.${stickerCode}.isConseguida`]: true,
        [`inventory.${stickerCode}.updatedAt`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `transfer/${fromAlbumId}->${toAlbumId}`);
    }
  },

  async getGlobalAllAppStats() {
    try {
      const q = query(collection(db, 'users'), limit(100));
      const snapshot = await getDocs(q);
      
      let totalUsersCount = snapshot.size;
      let totalSwapsCompleted = 0;
      let totalCompletionPercentageSum = 0;
      let highestCompletionRaw = 0;
      let userWithHighestPercentage: { id: string, name: string, percentage: number } | null = null;
      
      snapshot.forEach(docSnap => {
        const u = docSnap.data();
        const swaps = u.stats?.completedSwaps || 0;
        const completion = u.stats?.completionPercentage || 0;
        
        totalSwapsCompleted += swaps;
        totalCompletionPercentageSum += completion;
        
        if (completion > highestCompletionRaw) {
          highestCompletionRaw = completion;
          userWithHighestPercentage = {
            id: docSnap.id,
            name: u.displayName || u.email || 'Anonymous',
            percentage: completion
          };
        }
      });
      
      const averageCompletion = totalUsersCount > 0 ? Math.round(totalCompletionPercentageSum / totalUsersCount) : 0;
      
      return {
        totalUsers: totalUsersCount || 1,
        totalSwaps: totalSwapsCompleted,
        averageCompletionPercent: averageCompletion,
        topCollector: userWithHighestPercentage
      };
    } catch (e) {
      console.error("Failed to fetch global app stats", e);
      return {
        totalUsers: 1,
        totalSwaps: 0,
        averageCompletionPercent: 0,
        topCollector: null
      };
    }
  },

  async getAllUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error getting all users", e);
      return [];
    }
  },

  async toggleUserPremium(userId: string, isPremium: boolean) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isPremium,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error("Error toggling premium status", e);
      return false;
    }
  },

  async getTotalAlbumsCount() {
    try {
      const snap = await getDocs(collection(db, 'albums'));
      return snap.size;
    } catch (e) {
      console.error("Error getting exact albums count", e);
      return 0;
    }
  }
};
