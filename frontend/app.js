const express = require('express');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios'); // Asegúrate de tener instalado: npm install axios

const app = express();
const port = 8080; 
const API_URL = 'http://localhost:3000/api'; 

// Middlewares
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'public',
  layoutsDir: path.join(__dirname, 'views/layouts'),
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middleware para verificar autenticación (Básico)
const isAuthenticated = (req, res, next) => {
  if (req.cookies.session_user) {
    return next();
  }
  res.redirect('/login');
};

// Middleware para usuarios YA logueados (para login/register)
const isGuest = (req, res, next) => {
    if (req.cookies.session_user) {
        return res.redirect('/perfil');
    }
    next();
};

// --- RUTAS PÚBLICAS (Vistas) ---

app.get('/', isGuest, (req, res) => {
  res.render('index', { active: { inicio: true } });
});

app.get('/index', isGuest, (req, res) => {
  res.render('index', { active: { inicio: true } });
});

app.get('/register', isGuest, (req, res) => {
  res.render('register', { active: { registro: true } });
});

app.get('/login', isGuest, (req, res) => {
  res.render('login', { active: { acceso: true } });
});

app.get('/informacion', (req, res) => {
  res.render('informacion', { active: { info: true } });
});

app.get('/ruleta-info', (req, res) => {
  res.render('ruleta-info', { active: { reglas: true } });
});

// --- RUTAS POST (Procesamiento de Formularios) --- 
// ¡¡ESTO ES LO QUE TE FALTABA!!

// 1. Procesar Registro
// 1. Procesar Registro
app.post('/register', isGuest, async (req, res) => {
    // Datos tal cual vienen del HTML (name="nombre", name="correo"...)
    const { nombre, correo, username, password, confirmar, fecha, terminos } = req.body;

    // VALIDACIÓN: Verificar que las contraseñas coincidan
    if (password !== confirmar) {
        return res.render('register', {
            active: { registro: true },
            error: 'Las contraseñas no coinciden 🚫',
            nombre, correo, username, fecha
        });
    }

    // VALIDACIÓN: Términos
    if (!terminos) {
         return res.render('register', {
            active: { registro: true },
            error: 'Debes aceptar los términos 📜',
            nombre, correo, username, fecha
        });
    }

    try {
        // ENVIAR AL BACKEND
        // ¡Aquí estaba el problema de idioma! Ahora coincide con tu Schema de Mongoose:
        await axios.post(`${API_URL}/auth/register`, {
            username: username,         // Coincide con Schema
            password: password,         // Coincide con Schema
            nombre: nombre,             // ANTES: fullName (Error) -> AHORA: nombre (Correcto)
            correo: correo,             // ANTES: email (Error) -> AHORA: correo (Correcto)
            fechaNacimiento: fecha      // ANTES: birthDate (Error) -> AHORA: fechaNacimiento (Correcto)
        });
        
        // ÉXITO
        res.render('login', {
            active: { acceso: true },
            success: '¡Cuenta creada con éxito! Por favor inicia sesión 🌸'
        });

    } catch (error) {
        console.error('⚠️ ERROR AL REGISTRAR:', error.message);
        
        // ESPÍA DEL ERROR 404
        if (error.response) {
            console.log('El servidor respondió status:', error.response.status);
            console.log('Datos del error:', error.response.data);
        }

        // Mensaje para el usuario
        let mensajeError = 'Error al registrarse. Intenta de nuevo.';
        if (error.response && error.response.data && error.response.data.message) {
            mensajeError = error.response.data.message;
        }

        res.render('register', { 
            active: { registro: true },
            error: mensajeError,
            nombre, correo, username, fecha
        });
    }
});


// 2. Procesar Login
app.post('/login', isGuest, async (req, res) => {
    try {
        console.log("📨 [Login Frontend] Datos recibidos del HTML:", req.body);

        // 1. CAPTURAR EL DATO CORRECTO
        // Tu HTML usa name="username", así que req.body.username tendrá el dato.
        // Pero por si acaso cambiamos el HTML en el futuro, buscamos ambos.
        const usuarioInput = req.body.username || req.body.email; 
        const passwordInput = req.body.password;

        if (!usuarioInput) {
            console.error("❌ El formulario no envió usuario ni correo");
            return res.render('login', { active: { acceso: true }, error: 'Debes escribir un usuario' });
        }

        // 2. ENVIAR AL BACKEND
        // Importante: Al backend le mandamos el dato en el campo 'email', 
        // porque así configuramos tu authController para que lo reciba.
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: usuarioInput, // Aquí va "juanito" o "juan@gmail.com"
            password: passwordInput
        });

        // 3. RECIBIR RESPUESTA Y GUARDAR COOKIE
        const token = response.data.token || response.data.user;

        res.cookie('session_user', token, { 
            httpOnly: true, 
            maxAge: 3600000 // 1 hora
        });

        console.log("✅ Login exitoso en Frontend. Redirigiendo...");
        res.redirect('/perfil');

    } catch (error) {
        console.error('❌ Error en login (Frontend):', error.message);
        
        // Si el backend nos da una razón específica (ej: "Contraseña incorrecta"), la mostramos.
        let mensaje = 'Correo o contraseña incorrectos.';
        if (error.response && error.response.data && error.response.data.error) {
            mensaje = error.response.data.error;
        }

        res.render('login', { 
            active: { acceso: true },
            error: mensaje
        });
    }
});


// --- RUTAS PRIVADAS ---

// Perfil
app.get('/perfil', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Cookie: `session_user=${req.cookies.session_user}` }
    });
    
    const data = response.data;
    
    res.render('perfil', {
      layout: 'private',
      active: { perfil: true },
      user: data.user,
      saldo: data.saldo ? data.saldo.toLocaleString('es-CL') : '0',
      partidasJugadas: 70, 
      rondasGanadas: 18,
      mayorGanancia: "10.000,00",
      tiempoJuego: "1h 7m"
    });

  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        res.clearCookie('session_user');
        return res.redirect('/login');
    }
    console.error('Error al cargar perfil:', error.message);
    res.render('perfil', {
      layout: 'private',
      active: { perfil: true },
      user: { nombre: 'Usuario' },
      saldo: '0'
    });
  }
});

// Ruleta
app.get('/ruleta', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Cookie: `session_user=${req.cookies.session_user}` }
    });
    
    res.render('ruleta', {
      layout: 'private',
      active: { ruleta: true },
      saldo: response.data.saldo ? response.data.saldo.toLocaleString('es-CL') : '0'
    });
  } catch (error) {
    console.error('Error al cargar ruleta:', error.message);
    res.render('ruleta', {
      layout: 'private',
      active: { ruleta: true },
      saldo: '0'
    });
  }
});

// Transacciones
app.get('/transacciones', isAuthenticated, async (req, res) => {
  try {
    const [profileReq, transactionsReq] = await Promise.all([
        axios.get(`${API_URL}/auth/profile`, { headers: { Cookie: `session_user=${req.cookies.session_user}` } }),
        axios.get(`${API_URL}/transactions`, { headers: { Cookie: `session_user=${req.cookies.session_user}` } })
    ]);

    const profileData = profileReq.data;
    const transactionsData = transactionsReq.data;
    
    res.render('transacciones', {
      layout: 'private',
      active: { transacciones: true },
      saldo: profileData.saldo ? profileData.saldo.toLocaleString('es-CL') : '0',
      transacciones: transactionsData.map(t => ({
        ...t,
        monto: t.monto.toLocaleString('es-CL')
      }))
    });
  } catch (error) {
    console.error('Error al cargar transacciones:', error.message);
    res.render('transacciones', {
      layout: 'private',
      active: { transacciones: true },
      saldo: '0',
      transacciones: []
    });
  }
});

// Ruta protegida info
app.get('/ruleta-info-duplica', isAuthenticated, (req, res) => {
  res.render('ruleta-info-duplica', {
    layout: 'private',
    active: { reglas: true }
  });
});

// Logout
app.get('/logout', isAuthenticated, (req, res) => {
  res.render('logout', {
    layout: 'private',
    active: { logout: true }
  });
});

app.get('/logout/confirmar', (req, res) => {
  res.clearCookie('session_user', { path: '/', httpOnly: true, sameSite: 'lax' });
  res.redirect('/login');
});

// Servidor
app.listen(port, () => {
  console.log(`🎰 Frontend corriendo en http://localhost:${port}`);
});