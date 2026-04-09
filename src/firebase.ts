import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Disable app verification for testing. 
// This allows you to use "Test Phone Numbers" in Firebase Console without Play Integrity/reCAPTCHA failing.
auth.settings.appVerificationDisabledForTesting = true;

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
