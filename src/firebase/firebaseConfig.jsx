// firebaseConfig.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importa Firestore
import { getStorage } from "firebase/storage";   // Importa Storage
// import { getAnalytics } from "firebase/analytics"; // Analytics no es necesario para esta funcionalidad

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi_Ib60RvM2IWjjLtF0iVTaNe2MlvbNlI",
  authDomain: "capiccio-de-pizza.firebaseapp.com",
  projectId: "capiccio-de-pizza",
  storageBucket: "capiccio-de-pizza.firebasestorage.app",
  messagingSenderId: "179467906709",
  appId: "1:179467906709:web:64cf03a00c59860e15b59c",
  measurementId: "G-B99Y49FPPS" // Puedes mantenerlo si lo usas, pero no es crucial para Firestore/Storage
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
