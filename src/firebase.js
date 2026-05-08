import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCGGDvQWuXriy4QGIISnXL4epDJZvWDVPg',
  authDomain: 'myproject-9b1e5.firebaseapp.com',
  projectId: 'myproject-9b1e5',
  storageBucket: 'myproject-9b1e5.firebasestorage.app',
  messagingSenderId: '921817432126',
  appId: '1:921817432126:web:63f763ce62de85df0b116f',
  measurementId: 'G-SDKSMNVX7X',
};

// init
const app = initializeApp(firebaseConfig);

// export
export const auth = getAuth(app);
export const db = getFirestore(app);
