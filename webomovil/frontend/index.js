const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const axios = require('axios'); // Asegúrate de tenerlo: npm install axios

const app = express();
const port = 80; 
const BACKEND_URL = 'http://localhost:3000/api'; // Dirección de tu backend





// === MODO DEPURACIÓN DE ESTÁTICOS ===

// 1. Forzar ruta del CSS para ver si el archivo existe
app.get('/style.css', (req, res) => {
    const rutaAbsoluta = path.join(__dirname, 'public', 'style.css');
    console.log("🔍 Buscando CSS en:", rutaAbsoluta);
    
    res.sendFile(rutaAbsoluta, (err) => {
        if (err) {
            console.log("❌ ERROR: No encontré el archivo. Verifica la ruta.");
            res.status(404).send("No encontré el archivo style.css");
        } else {
            console.log("✅ ÉXITO: Archivo enviado correctamente.");
        }
    });
});

// 2. Servir el resto de la carpeta public (Imágenes, scripts)
app.use(express.static(path.join(__dirname, 'public')));




// === CONFIGURACIÓN ===
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // Para leer formularios HTML
app.use(express.json());
//app.use(express.static(path.join(__dirname, 'public')));

app.engine('handlebars', engine({
    defaultLayout: 'public',
    layoutsDir: path.join(__dirname, 'views/layouts'),
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// === MIDDLEWARE DE SESIÓN ===
const verificarSesion = (req, res, next) => {
    if (req.cookies.username) {
        req.user = req.cookies.username;
        return next();
    }
    res.redirect('/login');
};

// === HELPER: FORMATEAR TRANSACCIONES ===
// Convierte datos crudos del backend en datos bonitos para Handlebars
const formatearTransacciones = (lista) => {
    if (!lista) return [];
    return lista.map(t => ({
        fecha: new Date(t.fecha).toLocaleString("es-CL"),
        monto: t.monto.toLocaleString('es-CL'),
        tipo: t.tipo,
        tipoClase: t.tipo === "Depósito" ? "monto-deposito" : "monto-retiro",
        esDeposito: t.tipo === "Depósito"
    }));
};

// =============================
//      RUTAS PÚBLICAS
// =============================

app.get('/', (req, res) => {
    if (req.cookies.username) return res.redirect('/perfil');
    res.render('index', { active: { inicio: true } });
});

app.get('/index', (req, res) => {
    if (req.cookies.username) return res.redirect('/perfil');
    res.render('index', { active: { inicio: true } });
});

app.get('/informacion', (req, res) => res.render('informacion', { active: { info: true } }));
app.get('/ruleta-info', (req, res) => res.render('ruleta-info', { active: { reglas: true } }));

// --- LOGIN Y REGISTRO ---

app.get('/login', (req, res) => {
    if (req.cookies.username) return res.redirect('/perfil');
    res.render('login', { active: { acceso: true } });
});

app.post('/login', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/login`, req.body);
        if (response.data.success) {
            // Guardamos cookie y redirigimos
            res.cookie('username', req.body.username, { httpOnly: true });
            res.redirect('/perfil');
        } else {
            res.render('login', { error: response.data.message || 'Error de acceso' });
        }
    } catch (error) {
        res.render('login', { error: 'No se pudo conectar con el servidor' });
    }
});

app.get('/register', (req, res) => {
    if (req.cookies.username) return res.redirect('/perfil');
    res.render('register', { active: { registro: true } });
});

app.post('/register', async (req, res) => {
    if (req.body.password !== req.body.confirmar) {
        return res.render('register', { error: 'Las contraseñas no coinciden' });
    }
    try {
        await axios.post(`${BACKEND_URL}/register`, req.body);
        res.render('login', { success: '¡Cuenta creada! Inicia sesión.' });
    } catch (error) {
        const msg = error.response?.data?.error || 'Error al registrar';
        res.render('register', { error: msg });
    }
});

app.get('/logout', verificarSesion, (req, res) => {
    res.render('logout', { layout: 'private', active: { logout: true } });
});

app.get('/logout/confirmar', (req, res) => {
    res.clearCookie('username');
    res.redirect('/login');
});

// =============================
//      RUTAS PRIVADAS
// =============================

// 1. PERFIL
app.get('/perfil', verificarSesion, async (req, res) => {
    try {
        const { data } = await axios.get(`${BACKEND_URL}/user/${req.user}`);
        
        res.render('perfil', {
            layout: 'private',
            active: { perfil: true },
            user: data.user,
            saldo: data.user.saldo.toLocaleString('es-CL'),
            // Usamos el helper para que se vea bien la fecha y montos
            transacciones: formatearTransacciones(data.transacciones),
            // Datos estadísticos simulados o calculados
            partidasJugadas: data.ultimosJuegos.length * 5, // Simulado
            rondasGanadas: data.ultimosJuegos.filter(j => j.gano).length,
            mayorGanancia: "Variado",
            tiempoJuego: "Calculando..."
        });
    } catch (e) {
        console.error(e);
        res.redirect('/logout/confirmar');
    }
});

// 2. MESA DE RULETA
app.get('/ruleta', verificarSesion, async (req, res) => {
    try {
        const { data } = await axios.get(`${BACKEND_URL}/user/${req.user}`);
        res.render('ruleta', {
            layout: 'private',
            active: { ruleta: true },
            saldo: data.user.saldo.toLocaleString('es-CL'),
            username: req.user // Importante para el script.js
        });
    } catch (e) {
        res.redirect('/login');
    }
});

app.get('/ruleta-info-duplica', verificarSesion, (req, res) => {
    res.render('ruleta-info-duplica', { layout: 'private', active: { reglas: true } });
});

// 3. TRANSACCIONES (VISTA)
app.get('/transacciones', verificarSesion, async (req, res) => {
    try {
        const { data } = await axios.get(`${BACKEND_URL}/user/${req.user}`);
        
        res.render('transacciones', {
            layout: 'private',
            active: { transacciones: true },
            saldo: data.user.saldo.toLocaleString('es-CL'),
            transacciones: formatearTransacciones(data.transacciones)
        });
    } catch (e) {
        console.error(e);
        res.render('transacciones', { layout: 'private', error: 'Error cargando datos' });
    }
});

// 4. PROCESAR DEPÓSITO (POST)
app.post('/depositar', verificarSesion, async (req, res) => {
    try {
        await axios.post(`${BACKEND_URL}/transaccion`, {
            username: req.user,
            tipo: 'Depósito',
            monto: req.body.monto
        });
        res.redirect('/transacciones');
    } catch (error) {
        console.error("Error depósito:", error.message);
        res.redirect('/transacciones');
    }
});

// 5. PROCESAR RETIRO (POST)
app.post('/retirar', verificarSesion, async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/transaccion`, {
            username: req.user,
            tipo: 'Retiro',
            monto: req.body.monto
        });
        
        if(response.data.error) {
            console.log("Error retiro:", response.data.error);
            // Aquí podrías renderizar la vista con el error, pero por simplicidad redirigimos
        }
        res.redirect('/transacciones');
    } catch (error) {
        console.error("Error retiro:", error.message);
        res.redirect('/transacciones');
    }
});

// INICIAR SERVIDOR
app.listen(port, () => console.log(`🌸 Frontend (Pocchinko) corriendo en puerto ${port}`));