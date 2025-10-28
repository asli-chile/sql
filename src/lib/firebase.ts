// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCSgJpjlnuEYMp28rpg3kQSAocMJVZICzE",
  authDomain: "asli-by-rc.firebaseapp.com",
  projectId: "asli-by-rc",
  storageBucket: "asli-by-rc.firebasestorage.app",
  messagingSenderId: "97873856307",
  appId: "1:97873856307:web:7a735a2260ca948f8be046"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
