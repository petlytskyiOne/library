import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCGGDvQWuXriy4QGIISnXL4epDJZvWDVPg',
  authDomain: 'myproject-9b1e5.firebaseapp.com',
  projectId: 'myproject-9b1e5',
  storageBucket: 'myproject-9b1e5.firebasestorage.app',
  messagingSenderId: '921817432126',
  appId: '1:921817432126:web:63f763ce62de85df0b116f',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
