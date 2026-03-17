import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const adminEmail = 'jayveer7773@gmail.com';
        const userEmail = (firebaseUser.email || '').trim().toLowerCase();
        const shouldBeAdmin = userEmail === adminEmail;

        try {
          const ref = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            const data = snap.data();
            const existingData = { id: snap.id, ...data };

            // Migration: role (string) -> roles (array)
            if (!existingData.roles || !Array.isArray(existingData.roles)) {
              existingData.roles = existingData.role ? [existingData.role] : ['pending'];
            }

            // Auto-upgrade to admin if email matches
            if (shouldBeAdmin && !existingData.roles.includes('admin')) {
              try {
                const newRoles = Array.from(new Set([...existingData.roles, 'admin'])).filter(r => r !== 'pending');
                await setDoc(ref, { roles: newRoles, role: 'admin', isActive: true }, { merge: true });
                existingData.roles = newRoles;
                existingData.role = 'admin'; // Keep for legacy
                existingData.isActive = true;
              } catch (e) {
                existingData.roles = ['admin'];
                existingData.isActive = true;
              }
            }
            setUserDoc(existingData);
          } else {
            // New user — check if they were invited
            let autoApprove = shouldBeAdmin;
            if (!autoApprove) {
              try {
                const inviteQ = query(collection(db, 'invites'), where('email', '==', userEmail));
                const inviteSnap = await getDocs(inviteQ);
                if (!inviteSnap.empty) {
                  autoApprove = true;
                  // Mark invite as accepted
                  const inviteDoc = inviteSnap.docs[0];
                  await updateDoc(doc(db, 'invites', inviteDoc.id), { status: 'accepted' });
                }
              } catch (e) {
                console.log('Invite check failed:', e);
              }
            }

            // Check if a manual user exists with same email — merge
            let manualUserId = null;
            try {
              const manualQ = query(collection(db, 'users'), where('email', '==', userEmail), where('isManual', '==', true));
              const manualSnap = await getDocs(manualQ);
              if (!manualSnap.empty) {
                manualUserId = manualSnap.docs[0].id;
                // Delete the manual record, we'll create a real one
                await deleteDoc(doc(db, 'users', manualUserId));
                autoApprove = true;
              }
            } catch (e) {
              console.log('Manual user check failed:', e);
            }

            const newUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              role: shouldBeAdmin ? 'admin' : (autoApprove ? 'designer' : 'pending'), // Legacy
              roles: shouldBeAdmin ? ['admin'] : (autoApprove ? ['designer'] : ['pending']),
              isActive: shouldBeAdmin || autoApprove,
              dailyCapacity: 8,
              createdAt: serverTimestamp(),
            };
            await setDoc(ref, newUser);
            setUserDoc({ id: firebaseUser.uid, ...newUser });
          }
        } catch (err) {
          console.error('Error in auth state handler:', err);
          if (shouldBeAdmin) {
            setUserDoc({
              id: firebaseUser.uid, uid: firebaseUser.uid,
              name: firebaseUser.displayName || '', email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '', role: 'admin',
              isActive: true, dailyCapacity: 8,
            });
          }
        }
      } else {
        setUser(null);
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const refreshUserDoc = async () => {
    if (!user || !db) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) setUserDoc({ id: snap.id, ...snap.data() });
  };

  const value = {
    user, userDoc, loading, login, logout, refreshUserDoc,
    isAdmin: userDoc?.roles?.includes('admin'),
    isDesigner: userDoc?.roles?.includes('designer'),
    isPending: userDoc?.roles?.includes('pending'),
    isActive: userDoc?.isActive === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
