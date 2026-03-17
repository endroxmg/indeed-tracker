import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Users ─────────────────────────────────────────────────
export async function createUserDoc(uid, data) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
  }
  return (await getDoc(ref)).data();
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeUsers(callback) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

// ─── Tickets ───────────────────────────────────────────────
export function subscribeTickets(callback) {
  const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createTicket(data) {
  const ref = await addDoc(collection(db, 'tickets'), {
    ...data,
    status: 'todo',
    versions: [
      {
        versionNumber: 1,
        startedAt: Timestamp.now(),
        submittedAt: null,
        completedAt: null,
        feedbackItems: [],
      },
    ],
    fileDelivery: { mp4: false, webm: false, afterEffects: false, premiere: false, figma: false },
    videoDurationSec: null,
    frameioAssetId: null,
    lastSyncedAt: null,
    statusHistory: [{ status: 'todo', timestamp: Timestamp.now(), movedBy: data.createdBy }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

export async function updateTicket(ticketId, data) {
  await updateDoc(doc(db, 'tickets', ticketId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getTicket(ticketId) {
  const snap = await getDoc(doc(db, 'tickets', ticketId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteTicket(ticketId) {
  await deleteDoc(doc(db, 'tickets', ticketId));
}

// ─── Time Entries ──────────────────────────────────────────
export async function addTimeEntry(data) {
  return addDoc(collection(db, 'timeEntries'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateTimeEntry(entryId, data) {
  await updateDoc(doc(db, 'timeEntries', entryId), data);
}

export async function deleteTimeEntry(entryId) {
  await deleteDoc(doc(db, 'timeEntries', entryId));
}

export function subscribeTimeEntries(callback, filters = {}) {
  let q = collection(db, 'timeEntries');
  const constraints = [];
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.date) constraints.push(where('date', '==', filters.date));
  if (filters.dateFrom) constraints.push(where('date', '>=', filters.dateFrom));
  if (filters.dateTo) constraints.push(where('date', '<=', filters.dateTo));
  constraints.push(orderBy('date', 'desc'));

  const finalQ = query(q, ...constraints);
  return onSnapshot(finalQ, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getTimeEntriesForRange(dateFrom, dateTo) {
  const q = query(
    collection(db, 'timeEntries'),
    where('date', '>=', dateFrom),
    where('date', '<=', dateTo),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Activity Log ──────────────────────────────────────────
export async function logActivity(data) {
  return addDoc(collection(db, 'activityLog'), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

export function subscribeActivityLog(callback, limitCount = 20) {
  const q = query(
    collection(db, 'activityLog'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getActivityLogForRange(dateFrom, dateTo) {
  const q = query(
    collection(db, 'activityLog'),
    where('timestamp', '>=', Timestamp.fromDate(new Date(dateFrom))),
    where('timestamp', '<=', Timestamp.fromDate(new Date(dateTo + 'T23:59:59'))),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Invites ───────────────────────────────────────────────
export async function createInvite(email, invitedBy) {
  // Check if invite already exists
  const q = query(collection(db, 'invites'), where('email', '==', email.toLowerCase()));
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;

  const ref = await addDoc(collection(db, 'invites'), {
    email: email.toLowerCase(),
    invitedBy,
    status: 'pending', // pending | accepted
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getInviteByEmail(email) {
  const q = query(collection(db, 'invites'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function updateInvite(inviteId, data) {
  await updateDoc(doc(db, 'invites', inviteId), data);
}

export async function deleteInvite(inviteId) {
  await deleteDoc(doc(db, 'invites', inviteId));
}

export function subscribeInvites(callback) {
  const q = query(collection(db, 'invites'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ─── Manual Users (admin-created, no login required) ───────
export async function createManualUser(data) {
  const { setDoc } = await import('firebase/firestore');
  // Use email as a deterministic ID for manual users
  const id = 'manual_' + data.email.replace(/[^a-zA-Z0-9]/g, '_');
  const ref = doc(db, 'users', id);
  await setDoc(ref, {
    uid: id,
    name: data.name,
    email: data.email.toLowerCase(),
    photoURL: '',
    role: 'designer',
    isActive: true,
    dailyCapacity: data.dailyCapacity || 8,
    isManual: true, // Flag for manually created users
    createdAt: serverTimestamp(),
  });
  return id;
}

