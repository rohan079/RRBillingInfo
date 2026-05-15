import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAzesCejUvrn7k6895uA0EHm1-oIt4xiBQ',
  authDomain: 'ecommerce-9961.firebaseapp.com',
  projectId: 'ecommerce-9961',
  storageBucket: 'ecommerce-9961.firebasestorage.app',
  messagingSenderId: '177517728294',
  appId: '1:177517728294:web:f6ea20686aff35d5ec8ce7',
  measurementId: 'G-LC8XKBVH43',
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);

/** Analytics only when supported (browser). */
export function initFirebaseAnalytics(): void {
  if (typeof window === 'undefined') return;
  void import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    void isSupported().then((ok) => {
      if (ok) {
        getAnalytics(firebaseApp);
      }
    });
  });
}
