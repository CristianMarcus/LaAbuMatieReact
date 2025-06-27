import { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Hook personalizado para gestionar la inicialización de Firebase, autenticación y perfil de usuario.
 *
 * @param {Object} firebaseConfig - Objeto de configuración de Firebase.
 * @param {string|null} initialAuthToken - Token de autenticación personalizado inicial (opcional).
 * @param {Function} showNotification - Función para mostrar notificaciones.
 * @param {string} currentPage - La página actual de la aplicación (para lógica de redirección).
 * @param {string} localProjectId - El projectId de la configuración local de Firebase.
 * @returns {Object} Un objeto que contiene:
 * - {Object|null} db: Instancia de Firestore.
 * - {Object|null} auth: Instancia de Auth.
 * - {string|null} userId: ID del usuario autenticado.
 * - {Object|null} userProfile: Perfil del usuario (con rol).
 * - {boolean} isAuthReady: Verdadero si la autenticación está lista.
 * - {boolean} isLoadingAuth: Verdadero si la autenticación está en curso.
 * - {Function} handleAdminLogin: Función para iniciar sesión como administrador.
 * - {Function} handleAdminLogout: Función para cerrar sesión de administrador.
 */
export const useFirebase = (firebaseConfig, initialAuthToken, showNotification, currentPage, localProjectId) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Estado para evitar re-autenticación durante el logout

  // Inicializa Firebase App, Auth y Firestore
  useEffect(() => {
    const isFirebaseConfigValid = firebaseConfig && Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey;

    if (!isFirebaseConfigValid) {
      console.error('Firebase: Configuración de Firebase no disponible.');
      // Generar un ID de usuario aleatorio si Firebase no está configurado para permitir el uso básico de la app
      setUserId(crypto.randomUUID()); 
      setIsAuthReady(true);
      setIsLoadingAuth(false); 
      return;
    }

    if (!isFirebaseInitialized) {
      let firebaseApp;
      if (getApps().length === 0) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = getApp();
      }

      const firestore = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setDb(firestore);
      setAuth(firebaseAuth);
      setIsFirebaseInitialized(true); 
    }
  }, [firebaseConfig, isFirebaseInitialized]);

  // Maneja los cambios de estado de autenticación
  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Si no hay usuario autenticado y no estamos en proceso de cerrar sesión
        // y no estamos en las páginas de admin/contacto (donde la autenticación puede ser diferente)
        if (!isLoggingOut && currentPage !== 'admin-login' && currentPage !== 'admin-dashboard' && currentPage !== 'powa-contact') {
          if (initialAuthToken) { 
              try {
                  await signInWithCustomToken(auth, initialAuthToken);
                  console.log('Firebase: Autenticado con token personalizado.');
              } catch (tokenSignInError) {
                  console.error('Firebase: Error al autenticar con token personalizado, intentando de forma anónima:', tokenSignInError);
                  showNotification('Error de autenticación con token. Algunas funciones pueden estar limitadas.', 'error'); 
                  await signInAnonymously(auth); 
                  setUserId(auth.currentUser.uid); 
              }
          } else { 
              try {
                  await signInAnonymously(auth);
                  console.log('Firebase: Autenticado de forma anónima.');
                  setUserId(auth.currentUser.uid); 
              } catch (signInError) {
                  console.error('Firebase: Error de autenticación anónima:', signInError);
                  showNotification('¡URGENTE! Error de autenticación anónima: Por favor, ve a la Consola de Firebase > Authentication > Métodos de inicio de sesión y HABILITA "Anónima".', 'error', 12000); 
                  // Si falla la autenticación anónima, generamos un ID aleatorio para que la app no se bloquee
                  setUserId(crypto.randomUUID()); 
              }
              
          }
        } else {
          setUserId(null); 
        }
        setUserProfile(null); // Limpiar perfil si no hay usuario
      }
      setIsAuthReady(true); // La autenticación ha sido verificada
      setIsLoadingAuth(false); // La carga de autenticación ha terminado
    });

    return () => {
      unsubscribe(); // Limpiar el listener al desmontar
    };
  }, [auth, initialAuthToken, isLoggingOut, currentPage, showNotification]);

  // Carga o crea el perfil de usuario en Firestore
  useEffect(() => {
    // Solo proceder si db, userId y auth están listos y no estamos cerrando sesión
    if (!db || !userId || !isAuthReady || isLoggingOut) {
      return;
    }

    const fetchOrCreateUserProfile = async () => {
      // Determina el appId correcto para Firestore (prioriza el de Canvas si existe)
      const actualAppIdForFirestore = (typeof __app_id !== 'undefined' && __app_id !== 'default-app-id') ? __app_id : localProjectId;
      const userProfileRef = doc(db, `artifacts/${actualAppIdForFirestore}/public/data/users/${userId}`);
      try {
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          // Si el perfil existe, cargarlo
          const profileData = { id: userProfileSnap.id, ...userProfileSnap.data() };
          setUserProfile(profileData);
        } else {
          // Si el perfil no existe, crearlo con rol 'user'
          const newUserProfile = {
            role: 'user', 
            createdAt: new Date().toISOString(),
          };
          // Solo intenta crear el documento si el usuario actual es el que estamos intentando cargar
          if (auth && auth.currentUser && auth.currentUser.uid === userId) {
            await setDoc(userProfileRef, newUserProfile); 
            const profileData = { id: userId, ...newUserProfile };
            setUserProfile(profileData);
            console.log(`Perfil de usuario ${userId} creado con rol: user.`);
          } else {
            // Esto puede ocurrir si el usuario se desautentica rápidamente o hay un desajuste
            showNotification('Error de sincronización de autenticación. Por favor, recarga la página o inténtalo de nuevo.', 'warning', 7000);
            setUserProfile({ id: userId, role: 'user' }); // Fallback para que la app funcione
          }
        }
      } catch (profileError) {
        console.error("Error al cargar/crear perfil de usuario:", profileError);
        setUserProfile({ id: userId, role: 'user' }); // Fallback
        if (profileError.code === 'permission-denied') {
            showNotification('Error de permisos al cargar/crear perfil. Consulta las reglas de seguridad de Firestore.', 'error', 10000);
        } else {
            showNotification(`Error desconocido al cargar/crear perfil: ${profileError.message}`, 'error', 8000);
        }
      }
    };

    fetchOrCreateUserProfile();
  }, [userId, db, isAuthReady, auth, showNotification, isLoggingOut, localProjectId]);

  // Función para iniciar sesión de administrador
  const handleAdminLogin = useCallback(async (email, password) => {
    if (!auth || !db) {
      showNotification("Firebase no inicializado correctamente.", "error");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const actualAppIdForFirestore = (typeof __app_id !== 'undefined' && __app_id !== 'default-app-id') ? __app_id : localProjectId;
      const userProfileRef = doc(db, `artifacts/${actualAppIdForFirestore}/public/data/users/${user.uid}`);
      const userProfileSnap = await getDoc(userProfileRef);
      let profileData;

      if (userProfileSnap.exists()) {
        profileData = userProfileSnap.data();
      } else {
        // Si no hay perfil, crearlo como usuario normal por defecto
        profileData = { role: 'user', createdAt: new Date().toISOString() }; 
        if (auth.currentUser && auth.currentUser.uid === user.uid) {
          await setDoc(userProfileRef, profileData);
        }
      }
      const profile = { id: user.uid, ...profileData };

      // Si el rol no es 'admin', cerrar sesión y notificar
      if (profile.role !== 'admin') {
        await signOut(auth); 
        showNotification('Acceso denegado: Este usuario no es un administrador.', 'error');
        return { success: false, message: 'Acceso denegado: No eres administrador.' };
      } else {
        setUserId(user.uid);
        setUserProfile(profile);
        showNotification('Bienvenido, Administrador.', 'success');
        return { success: true };
      }

    } catch (loginError) {
      let errorMessage = 'Error al iniciar sesión. Por favor, inténtalo de nuevo.';
      switch (loginError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Formato de correo electrónico inválido.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Este usuario ha sido deshabilitado.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Por favor, intenta de nuevo más tarde.';
          break;
        default:
          errorMessage = `Error de autenticación: ${loginError.message}`;
          break;
      }
      showNotification(errorMessage, 'error');
      return { success: false, message: errorMessage };
    }
  }, [auth, db, showNotification, localProjectId]);

  // Función para cerrar sesión de administrador
  const handleAdminLogout = useCallback(async () => {
    if (auth) {
      try {
        setIsLoggingOut(true); // Indicar que estamos cerrando sesión
        await signOut(auth);
        showNotification('Sesión cerrada.', 'info'); 
        setUserProfile(null); // Limpiar el perfil al cerrar sesión
        setUserId(null); // Limpiar el userId
        return { success: true };
      } catch (logoutError) {
        showNotification('Error al cerrar sesión.', 'error');
        console.error('Error al cerrar sesión:', logoutError);
        return { success: false, message: 'Error al cerrar sesión.' };
      } finally {
        setIsLoggingOut(false); // Restablecer el estado de cierre de sesión
      }
    }
    return { success: false, message: 'Auth no disponible.' };
  }, [auth, showNotification]);

  return {
    db,
    auth,
    userId,
    userProfile,
    isAuthReady,
    isLoadingAuth,
    handleAdminLogin,
    handleAdminLogout,
  };
};
