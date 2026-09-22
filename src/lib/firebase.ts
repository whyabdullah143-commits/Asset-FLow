import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration loaded from provisioned Firebase project
export const firebaseConfig = {
  projectId: "gen-lang-client-0311659121",
  appId: "1:820058517326:web:3902df5019cf41f5c9781f",
  apiKey: "AIzaSyA5z3M-0PhQscW7uwI4kiLOt0-ACUClISU",
  authDomain: "gen-lang-client-0311659121.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixremixassetf-81d83ac3-3103-4d5e-a908-7822ec2eb078",
  storageBucket: "gen-lang-client-0311659121.firebasestorage.app",
  messagingSenderId: "820058517326",
};

let app: any;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn('Firebase initialization note:', e);
}

let firestoreDb: Firestore | null = null;
try {
  if (app) {
    if (firebaseConfig.firestoreDatabaseId) {
      firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      firestoreDb = getFirestore(app);
    }
  }
} catch (e) {
  try {
    if (app) firestoreDb = getFirestore(app);
  } catch (err) {
    console.warn('Firestore fallback note:', err);
  }
}

export { app, firestoreDb };
