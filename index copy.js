const express = require('express')
const { engine } = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const fs = require('fs')
const bcrypt = require('bcryptjs');

const app = express()
const port = 80

// === Middlewares ===
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// === Configurar Handlebars ===
app.engine('handlebars', engine({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')
app.set('views', './views')

// === Conexión a MongoDB ===
mongoose.connect('mongodb+srv://nociiva:pocchinko@pocchinko.mseba1s.mongodb.net/?appName=Pocchinko', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Conexión exitosa a MongoDB Atlas'))
  .catch(err => console.error(' Error conectando a MongoDB', err))

// === Modelo de Usuario ===


const UsuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // <-- Asegúrate de la COMA aquí
    password: { type: String, required: true },
    saldo: { type: Number, default: 1000 },
    nombreCompleto: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    fechaNacimiento: { type: Date, required: true }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);
// === Rutas ===

// Página principal → redirige a login
app.get('/', (req, res) => {
  res.redirect('/login')
})

// --- Ruta index ---

app.get('/index', (req, res) => {
    res.render('index');


});
// --- Ruta de Registro ---

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const {
        nombre,
        correo,
        username,
        password,
        confirmar,
        fecha
    } = req.body;

    if (password !== confirmar) {
        return res.send('Las contraseñas no coinciden. <a href="/register">Volver</a>');
    }

    try {
const existe = await Usuario.findOne({ username });
        if (existe) {
            return res.send('El nombre de usuario ya existe. <a href="/register">Volver</a>');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = new Usuario({
            username: username,
            password: hashedPassword,
            nombreCompleto: nombre,
            correo: correo,
            fechaNacimiento: fecha
        });

        await nuevoUsuario.save();

        res.send('Usuario registrado con éxito. <a href="/login">Iniciar sesión</a>');

    } catch (err) {
        console.error('Error al registrar usuario:', err);
        if (err.code === 11000) {
             return res.send('El usuario o correo ya existen. <a href="/register">Volver</a>');
        }
        res.send('Error interno al registrar usuario.');
    }
});


// --- Ruta de  Login ---
app.get('/login', (req, res) => {
  res.render('login')
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body

  try {

    const usuario = await Usuario.findOne({ username })

  const valido = await bcrypt.compare(password, usuario.password);
  if (!valido) return res.status(401).json({ error: "Contraseña incorrecta" });
    if (!usuario) {
      return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>')
    }

    // Redirige a la ruta /inicio en lugar de renderizar 'welcome'
    res.redirect('/index')
  } catch (err) {
    console.error('Error al buscar usuario:', err)
    res.send('Error interno del servidor')
  }
})


// -- Ruta de Logout --



// === Servidor ===
app.listen(port, () => {
  console.log(` App corriendo en http://localhost:${port}`)
})