La Abu Matie App!(public/LaAbuMatieLogo.jpeg)
¡Bienvenido al readme de La Abu Matie App! Esta es una aplicación web moderna construida con React y Firebase, diseñada para permitir a los clientes explorar un catálogo de productos caseros (milanesas, empanadas, pastas, etc.), añadir ítems al carrito, gestionar favoritos y realizar pedidos de forma sencilla. La aplicación incluye un panel de administración para la gestión de productos y pedidos.Tabla de ContenidosCaracterísticas PrincipalesTecnologías UtilizadasConfiguración del ProyectoRequisitos PreviosInstalaciónVariables de Entorno (.env)Configuración de FirebaseUso de la AplicaciónModo UsuarioModo AdministradorEstructura del ProyectoSEO y MetadatosDespliegueContribuciónLicenciaContactoCaracterísticas PrincipalesCatálogo de Productos: Explora una amplia variedad de productos caseros organizados por categorías.Búsqueda de Productos: Funcionalidad de búsqueda para encontrar rápidamente ítems específicos.Productos Destacados: Sección dedicada a mostrar productos populares o promocionales.Gestión de Carrito: Añade, actualiza cantidades, elimina y vacía productos del carrito.Persistencia del Carrito: Los ítems del carrito se guardan localmente para una experiencia de usuario fluida.Productos Favoritos: Marca productos como favoritos para un acceso rápido.Flujo de Pedido Intuitivo: Proceso de pedido guiado con resumen, formulario de datos y confirmación.Integración con WhatsApp: Envío automático del resumen del pedido a un número de WhatsApp predefinido.Panel de Administración:Gestión de productos (añadir, editar, eliminar).Gestión de pedidos (ver, actualizar estado).Gestión de productos destacados.Autenticación de Usuarios: Acceso anónimo para clientes y autenticación por email/contraseña para administradores (vía Firebase Auth).Modo Oscuro/Claro: Alterna entre temas visuales para una mejor experiencia.Notificaciones Toast: Mensajes de notificación interactivos para acciones del usuario.SEO Amigable: Gestión dinámica de metadatos con react-helmet-async.Diseño Responsivo: Interfaz adaptable a diferentes tamaños de pantalla (móvil, tablet, escritorio).Tecnologías UtilizadasFrontend:React (Biblioteca de JavaScript para interfaces de usuario)Vite (Herramienta de construcción rápida)Tailwind CSS (Framework CSS para estilos utilitarios)React Router DOM (Para la navegación en la aplicación)Lucide React (Librería de iconos)React Helmet Async (Para gestión de etiquetas <head> y SEO)Backend como Servicio (BaaS):Firebase Authentication (Gestión de usuarios)Firestore (Base de datos NoSQL en tiempo real)Configuración del ProyectoRequisitos PreviosAntes de comenzar, asegúrate de tener instalado lo siguiente:Node.js (versión 18 o superior recomendada)npm (viene con Node.js)Una cuenta de Firebase y un proyecto configurado.InstalaciónClona el repositorio:git clone https://github.com/CristianMarcus/LaAbuMatieReact.git
cd LaAbuMatieReact/LaAbuMatieApp
(Asegúrate de estar dentro de la carpeta LaAbuMatieApp)Instala las dependencias:npm install
Inicia el servidor de desarrollo:npm run dev
La aplicación se abrirá en tu navegador en http://localhost:5173 (o un puerto similar).Variables de Entorno (.env)Crea un archivo llamado .env en la raíz de tu proyecto (LaAbuMatieApp/) y añade tus credenciales de Firebase y el número de WhatsApp..env:VITE_FIREBASE_API_KEY="TU_API_KEY_DE_FIREBASE"
VITE_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN_DE_FIREBASE"
VITE_FIREBASE_PROJECT_ID="TU_PROJECT_ID_DE_FIREBASE"
VITE_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET_DE_FIREBASE"
VITE_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID_DE_FIREBASE"
VITE_FIREBASE_APP_ID="TU_APP_ID_DE_FIREBASE"
VITE_FIREBASE_MEASUREMENT_ID="TU_MEASUREMENT_ID_DE_FIREBASE"

VITE_WHATSAPP_NUMBER="NUMERO_DE_WHATSAPP_CON_CODIGO_DE_PAIS_EJ_5491123456789"
¡Importante! Asegúrate de que .env esté incluido en tu archivo .gitignore para evitar que tus credenciales se suban al repositorio público.Configuración de FirebaseCrea un proyecto en Firebase Console:Ve a Firebase Console y crea un nuevo proyecto.Añade una aplicación web a tu proyecto y copia las credenciales de configuración.Habilita Firebase Authentication:En Firebase Console, ve a Authentication -> Sign-in method.Habilita el método de inicio de sesión "Anonymous".Habilita el método de inicio de sesión "Email/Password" (para el administrador).Configura Firestore Database:En Firebase Console, ve a Firestore Database.Crea una nueva base de datos en modo de producción (o prueba, pero ajusta las reglas de seguridad).Reglas de Seguridad (Firestore Rules): Es crucial configurar las reglas para permitir el acceso adecuado. Aquí tienes un ejemplo de reglas para desarrollo, que deberías ajustar para producción:rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite lectura a cualquier usuario autenticado (incluido anónimo)
    // Solo administradores pueden escribir en colecciones públicas de datos (productos, pedidos)
    match /artifacts/{appId}/public/data/{collectionName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Permite a cualquier usuario autenticado leer perfiles de usuario
    // Permite a los usuarios escribir solo en su propio perfil
    match /artifacts/{appId}/public/data/users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Permite a los usuarios leer y escribir sus propios favoritos
    match /artifacts/{appId}/users/{userId}/favorites/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
Estructura de Datos (Colecciones):artifacts/{appId}/public/data/products: Colección para los productos. Cada documento es un producto.artifacts/{appId}/public/data/orders: Colección para los pedidos. Cada documento es un pedido.artifacts/{appId}/public/data/users: Colección para los perfiles de usuario (incluye el rol 'admin' o 'user').artifacts/{appId}/public/data/featured_products_config/manual_selection: Documento que contiene un array de productIds para los productos destacados.artifacts/{appId}/users/{userId}/favorites/data: Documento que contiene un array de productIds favoritos para cada usuario.Carga de Datos Iniciales (Opcional):Puedes cargar tus productos iniciales directamente en la colección products de Firestore. La aplicación espera campos como name, description, price, category, stock, imageUrl.Uso de la AplicaciónModo UsuarioExplorar: Navega por las categorías de productos o usa la barra de búsqueda.Añadir al Carrito: Haz clic en "Añadir al Carrito" en las tarjetas de producto.Ver Carrito: Haz clic en el icono del carrito flotante para ver y gestionar tus ítems.Realizar Pedido: Desde el carrito, procede al resumen y luego al formulario de pedido.Favoritos: Haz clic en el icono del corazón para marcar/desmarcar productos como favoritos.Contacto: Usa el botón "Agenda tu Consulta" en el footer para contactar a la agencia digital.Modo AdministradorPara acceder al panel de administración:Crea un usuario administrador en Firebase Authentication:En Firebase Console, ve a Authentication -> Users.Haz clic en Add user y crea un nuevo usuario con un email y contraseña.Asigna el rol de administrador a ese usuario en Firestore:En Firestore Database, ve a la colección artifacts/{appId}/public/data/users.Busca el documento cuyo ID coincida con el UID del usuario que acabas de crear en Authentication.Edita este documento y añade un campo role con el valor admin (por ejemplo: role: "admin").Inicia sesión como administrador:En la aplicación, haz clic en el pequeño texto "Admin" en la esquina inferior derecha del footer.Ingresa las credenciales del usuario que configuraste como administrador.Si el inicio de sesión es exitoso, serás redirigido al panel de administración.Estructura del ProyectoLaAbuMatieApp/
├── public/                     # Archivos estáticos (imágenes, favicons, data.json)
│   ├── LaAbuMatieLogo.jpeg
│   ├── LaAbuMatieSticker.jpeg
│   ├── data/
│   │   └── products.json       # Datos de productos iniciales (pueden ser migrados a Firestore)
│   └── img/                    # Imágenes de productos y banners
├── src/
│   ├── assets/                 # Activos adicionales (ej. react.svg)
│   ├── components/             # Componentes reutilizables de la UI
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminLogin.jsx
│   │   ├── FeaturedProductsSection.jsx
│   │   ├── Footer.jsx
│   │   ├── OrderFormModal.jsx
│   │   ├── OrderSummaryModal.jsx
│   │   ├── PowaContactForm.jsx
│   │   ├── ProductCard.jsx
│   │   ├── ProductDetailsModal.jsx
│   │   ├── ShoppingCartModal.jsx
│   │   └── ToastNotification.jsx
│   ├── hooks/                  # Hooks personalizados para lógica de negocio y estado
│   │   ├── useAdminWelcome.js
│   │   ├── useCart.js
│   │   ├── useFavorites.js
│   │   ├── useFeaturedProducts.js
│   │   ├── useFirebase.js
│   │   ├── useOrderFlow.js
│   │   ├── useProducts.js
│   │   ├── useScrollToTop.js
│   │   ├── useTheme.js
│   │   └── useToast.js
│   ├── App.css                 # Estilos CSS globales y animaciones
│   ├── App.jsx                 # Componente principal de la aplicación y enrutamiento
│   ├── index.css               # Estilos base de Tailwind y otros globales
│   └── main.jsx                # Punto de entrada de la aplicación (renderizado de React)
├── .env                        # Variables de entorno (NO SUBIR A GIT)
├── .firebaserc                 # Configuración de Firebase CLI
├── .gitignore                  # Archivos y directorios a ignorar por Git
├── firebase.json               # Configuración de despliegue de Firebase Hosting
├── firestore.indexes.json      # Índices de Firestore
├── firestore.rules             # Reglas de seguridad de Firestore
├── index.html                  # Plantilla HTML principal
├── package.json                # Dependencias y scripts del proyecto
├── package-lock.json           # Bloqueo de dependencias
├── postcss.config.js           # Configuración de PostCSS (para Tailwind)
├── tailwind.config.js          # Configuración de Tailwind CSS
└── vite.config.js              # Configuración de Vite
SEO y MetadatosLa aplicación utiliza react-helmet-async para gestionar dinámicamente las etiquetas <head> de la página, lo que es esencial para el SEO.Las meta etiquetas globales y por defecto (título, descripción, palabras clave, Open Graph, Twitter Card) se definen en src/App.jsx.Para verificar la aplicación de estas etiquetas, abre las herramientas de desarrollador de tu navegador (F12) y revisa la sección <head> en la pestaña "Elementos". Deberías ver las etiquetas con el atributo data-react-helmet="true".DespliegueLa aplicación está preparada para ser desplegada en Firebase Hosting.Construye la aplicación para producción:npm run build
Esto creará una carpeta dist/ con los archivos optimizados para producción.Despliega en Firebase Hosting:firebase deploy --only hosting
Asegúrate de tener la CLI de Firebase instalada y configurada (npm install -g firebase-tools y firebase login).Contribución¡Las contribuciones son bienvenidas! Si deseas contribuir a este proyecto, por favor, sigue estos pasos:Haz un "fork" del repositorio.Crea una nueva rama (git checkout -b feature/nueva-funcionalidad).Realiza tus cambios y asegúrate de que el código pase las pruebas.Haz "commit" de tus cambios (git commit -m 'feat: Añadir nueva funcionalidad X').Sube tus cambios a tu "fork" (git push origin feature/nueva-funcionalidad).Abre un "Pull Request" describiendo tus cambios.LicenciaEste proyecto está bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.ContactoPara cualquier pregunta o consulta, puedes contactar a:Cristian Marcus[cristianmarcus34@gmail.com]Tu Perfil de GitHub[https://github.com/CristianMarcus]