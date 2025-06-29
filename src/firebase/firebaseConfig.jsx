// firebaseConfig.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importa Firestore
import { getStorage } from "firebase/storage";   // Importa Storage
// import { getAnalytics } from "firebase/analytics"; // Analytics no es necesario para esta funcionalidad

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Puedes mantenerlo si lo usas, pero no es crucial para Firestore/Storage
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
const db = getFirestore(app);

// Inicializa Storage
const storage = getStorage(app);

// Si usas Analytics, puedes mantener esta línea:
// const analytics = getAnalytics(app);

// Exporta las instancias para usarlas en otros componentes
export { app, db, storage };
