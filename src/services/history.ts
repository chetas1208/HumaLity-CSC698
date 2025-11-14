import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const historyCollection = (uid: string) => collection(db, 'histories', uid, 'entries');

export interface HistoryEntryDocument {
  id: string;
  inputText: string;
  outputText: string;
  tone: string;
  createdAt: Timestamp | null;
}

export const saveHistoryEntry = async (params: {
  uid: string;
  inputText: string;
  outputText: string;
  tone: string;
}) => {
  const { uid, inputText, outputText, tone } = params;
  const docRef = await addDoc(historyCollection(uid), {
    inputText,
    outputText,
    tone,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const fetchHistoryEntries = async (uid: string, take = 20): Promise<HistoryEntryDocument[]> => {
  const q = query(historyCollection(uid), orderBy('createdAt', 'desc'), limit(take));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      inputText: data.inputText as string,
      outputText: data.outputText as string,
      tone: data.tone as string,
      createdAt: (data.createdAt as Timestamp) ?? null,
    };
  });
};

export const deleteHistoryEntryFromFirestore = async (uid: string, entryId: string) => {
  await deleteDoc(doc(db, 'histories', uid, 'entries', entryId));
};
