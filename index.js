const express = require('express')
const { engine } = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const app = express()
const port = 80
const saltRounds = 10

// === Middlewares ===
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))


// === Configurar Handlebars ===
app.engine('handlebars', engine({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')
app.set('views', './views')

// === Conexión MongoDB ===
mongoose.connect('mongodb+srv://nociiva:pocchinko@Pocchinko.mseba1s.mongodb.net/?appName=Pocchinko', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conexión exitosa a MongoDB Atlas'))
.catch(err => console.error('Error conectando a MongoDB', err))

// === Modelo de Usuario ===
const UsuarioSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  nombre: String,
  correo: String,
  fechaNacimiento: Date
}, { timestamps: true })

const Usuario = mongoose.model('Usuario', UsuarioSchema)

// === Middleware de Autenticación ===
const isAuthenticated = (req, res, next) => {
    if (req.cookies.session_user) {
        return next();
    }
    res.redirect('/login');
};

// === Rutas ===

// Ruta raíz
app.get('/', (req, res) => {
    if (req.cookies.session_user) {
        return res.redirect('/perfil');
    }
    res.render('index');
})

// Ruta index
app.get('/index', (req, res) => {
    if (req.cookies.session_user) {
        return res.redirect('/perfil');
    }
    res.render('index');
})

// Registro
app.get('/register', (req, res) => {
    if (req.cookies.session_user) {
        return res.redirect('/perfil');
    }
    res.render('register')
})

app.post('/register', async (req, res) => {
    const { username, password, confirmar, nombre, correo, fecha } = req.body

    if (password !== confirmar) {
        return res.send('Las contraseñas no coinciden. <a href="/register">Volver</a>')
    }
    if (!password || password.length < 6) {
        return res.send('La contraseña debe tener al menos 6 caracteres. <a href="/register">Volver</a>')
    }

    try {
        const existe = await Usuario.findOne({ username })
        if (existe) {
            return res.send('Usuario ya existe. <a href="/register">Volver</a>')
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds)
        const nuevoUsuario = new Usuario({
            username,
            password: hashedPassword,
            nombre,
            correo,
            fechaNacimiento: new Date(fecha)
        })
        
        await nuevoUsuario.save()
        res.send('Usuario registrado con éxito. <a href="/login">Iniciar sesión</a>')
        
    } catch (err) {
        console.error('Error al registrar usuario:', err)
        res.send('Error al registrar usuario. Intenta de nuevo.')
    }
})

// Login
app.get('/login', (req, res) => {
    if (req.cookies.session_user) {
        return res.redirect('/perfil');
    }
    res.render('login')
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body
    try {
        const usuario = await Usuario.findOne({ username }).select('+password')
        
        if (!usuario) {
            return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>')
        }

        const match = await bcrypt.compare(password, usuario.password)
        if (!match) {
            return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>')
        }

        res.cookie('session_user', username, { 
            httpOnly: true, 
            maxAge: 3600000, 
            path: '/' 
        })
        res.redirect('/perfil')
        
    } catch (err) {
        console.error('Error al buscar usuario:', err)
        res.send('Error interno del servidor')
    }
})

// Perfil
app.get('/perfil', isAuthenticated, async (req, res) => {
    const username = req.cookies.session_user
    try {
        const user = await Usuario.findOne({ username }).select('-password')
        
        if (!user) {
            res.clearCookie('session_user')
            return res.redirect('/login')
        }

        const mockData = {
            saldo: "37.500,00",
            partidasJugadas: 70,
            rondasGanadas: 18,
            mayorGanancia: "10000.00",
            tiempoJuego: "1h 7m",
            transacciones: [
                { fecha: '05/09/2025', monto: '+10000', tipo: 'Apuesta' },
                { fecha: '05/09/2025', monto: '+14000', tipo: 'Depósito' },
                { fecha: '20/08/2025', monto: '-5000', tipo: 'Apuesta' },
                { fecha: '16/08/2025', monto: '-5000', tipo: 'Retiro' },
                { fecha: '05/08/2025', monto: '+10000', tipo: 'Depósito' }
            ]
        }

        const fechaRegistro = user.createdAt ? 
            new Date(user.createdAt).toLocaleDateString('es-ES') : 
            'Fecha no disponible'

        res.render('perfil', {
            user: {
                nombre: user.nombre || 'N/A',
                username: user.username,
                correo: user.correo || 'N/A',
                fechaRegistro: fechaRegistro
            },
            ...mockData
        })
        
    } catch (err) {
        console.error('Error al cargar datos del usuario:', err)
        res.send('Error al cargar la página de perfil.')
    }
})

// Rutas no protegidas
app.get('/informacion', (req, res) => {
    res.render('informacion')
})

app.get('/ruleta-info',  (req, res) => {
    res.render('ruleta-info')
})

// Rutas protegidas
app.get('/ruleta-info-duplica', isAuthenticated, (req, res) => {
    res.render('ruleta-info-duplica')
})

// TRANSACCIONES - Ya está lista
app.get('/transacciones', isAuthenticated, (req, res) => {
    res.render('transacciones') // Tu plantilla de transacciones
})

// RULETA - Ya está lista  
app.get('/ruleta', isAuthenticated, (req, res) => {
    res.render('ruleta') // Tu plantilla de ruleta
})

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('session_user')
    res.redirect('/login')
})

app.use(express.static('public'))

// === Servidor ===
app.listen(port, () => {
    console.log(`App corriendo en http://localhost:${port}`)
})