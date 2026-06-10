import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyC5_IFa0UnJQS52GcpQdX-dmc5AVMWvyiY",
  authDomain: "mbl-qms.firebaseapp.com",
  projectId: "mbl-qms",
  storageBucket: "mbl-qms.firebasestorage.app",
  messagingSenderId: "9512176498",
  appId: "1:9512176498:web:3fa0500592484b6e82abeb",
  measurementId: "G-P884XNZZ51"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
