const express = require('express')
const { engine } = require('express-handlebars')
const router = express.Router();
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')


const app = express()
const port = 80
const saltRounds = 10

// === Middlewares ===
app.use(cookieParser())
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.static('public'));

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
  fechaNacimiento: Date,
  saldo: { type: Number, default: 0 } 

},{ timestamps: true,
  strict: true  
 })

const Usuario = mongoose.model('Usuario', UsuarioSchema)


// modelo de Transacción 
const TransaccionSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  monto: Number,
  tipo: String,
  estado: { type: String, default: "Completado" },
  fecha: { type: Date, default: Date.now }
})

const Transaccion = mongoose.model('Transaccion', TransaccionSchema)


//modelo guardado de datos ruleta
// === Modelo de ResultadoRuleta ===
const ResultadoRuletaSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  numero: { type: Number, required: true },
  color: { type: String, required: true },
  apuesta: { type: String, required: true }, // Tipo de apuesta que hizo
  monto: { type: Number, required: true },
  ganancia: { type: Number, default: 0 },
  gano: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

const ResultadoRuleta = mongoose.model('ResultadoRuleta', ResultadoRuletaSchema);


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

       
        const transacciones = await Transaccion.find({ usuario: username })
            .sort({ fecha: -1 })
            .limit(5) 

      
        const transaccionesPreparadas = transacciones.map(t => ({
            fecha: new Date(t.fecha).toLocaleString("es-CL"),
            monto: t.monto.toLocaleString('es-CL'),
            tipo: t.tipo,
            tipoClase: t.tipo === "Depósito" ? "monto-deposito" : "monto-retiro",
            esDeposito: t.tipo === "Depósito"
        }))

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
            saldo: user.saldo ? user.saldo.toLocaleString('es-CL') : '0',
            partidasJugadas: 70,
            rondasGanadas: 18,
            mayorGanancia: "10.000,00",
            tiempoJuego: "1h 7m",
            transacciones: transaccionesPreparadas
        })

    } catch (error) {
        console.error('Error al cargar perfil:', error)
        res.status(500).send('Error interno del servidor')
    }
})



// Rutas no protegidas
app.get('/informacion', (req, res) => { res.render('informacion') })
app.get('/ruleta-info',  (req, res) => { res.render('ruleta-info') })



// Rutas protegidas
app.get('/ruleta-info-duplica', isAuthenticated, (req, res) => {
    res.render('ruleta-info-duplica')
})



//ruta guardado de datos de la ruleta

app.post('/ruleta/guardar-resultado', isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user;
  const { numero, color, apuesta, monto, ganancia, gano } = req.body;
  
  try {
    await ResultadoRuleta.create({
      usuario: username,
      numero,
      color,
      apuesta,
      monto,
      ganancia,
      gano
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error al guardar resultado:', error);
    res.status(500).json({ success: false, error: 'Error al guardar resultado' });
  }
});


//ruta obtención de ult 5 datos
app.get('/api/ultimos-numeros', isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user;
  
  try {
    const ultimosNumeros = await ResultadoRuleta.find({ usuario: username })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('numero color gano createdAt')
      .lean();
    
    res.json(ultimosNumeros);
  } catch (error) {
    console.error('Error al obtener últimos números:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});




//ruleta
app.get('/ruleta', isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user
  try {
      const user = await Usuario.findOne({ username })
      res.render('ruleta', { 
          saldo: user?.saldo ? user.saldo.toLocaleString('es-CL') : '0'
      })
  } catch (err) {
      console.error('Error al cargar ruleta:', err)
      res.render('ruleta', { saldo: '0' })
  }
})

//transacciones

app.get('/transacciones', isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user

  try {
    const usuario = await Usuario.findOne({ username })
    const transacciones = await Transaccion.find({ usuario: username }).sort({ fecha: -1 })

    const transaccionesPreparadas = transacciones.map(t => ({
      fecha: new Date(t.fecha).toLocaleString("es-CL"),
      monto: t.monto.toLocaleString('es-CL'),
      tipo: t.tipo,
      tipoClase: t.tipo === "Depósito" ? "monto-deposito" : "monto-retiro",
      esDeposito: t.tipo === "Depósito"
    }))

    res.render("transacciones", {
      saldo: usuario?.saldo ? usuario.saldo.toLocaleString('es-CL') : '0',
      transacciones: transaccionesPreparadas
    })
  } catch (err) {
    console.error('Error al cargar transacciones:', err)
    res.send('Error al cargar transacciones.')
  }
})

//para depositar
app.post("/depositar", isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user
  const monto = parseInt(req.body.monto)

  if (monto < 2500) return res.send("Monto mínimo: 2500 Gars.")

  try {
    // actualizar saldo 
    await Usuario.updateOne(
      { username }, 
      { $inc: { saldo: monto } }, 
      { upsert: true }
    )
    
    // registrar
    await Transaccion.create({ 
      usuario: username, 
      monto, 
      tipo: "Depósito" 
    })

    res.redirect("/transacciones")
  } catch (err) {
    console.error('Error al depositar:', err)
    res.send('No se pudo registrar el depósito.')
  }
})


//retirar
app.post("/retirar", isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user
  const monto = parseInt(req.body.monto)

  if (monto < 5000) return res.send("Monto mínimo: 5000 Gars.")

  try {
    const usuario = await Usuario.findOne({ username })
    if (!usuario || usuario.saldo < monto) {
      return res.send("Saldo insuficiente.")
    }

    // Actualizar saldo
    await Usuario.updateOne(
      { username }, 
      { $inc: { saldo: -monto } }
    )
    
    // Registrar 
    await Transaccion.create({ 
      usuario: username, 
      monto, 
      tipo: "Retiro" 
    })

    res.redirect("/transacciones")
  } catch (err) {
    console.error('Error al retirar:', err)
    res.send('No se pudo registrar el retiro.')
  }
})

//logout
app.get('/logout', isAuthenticated, (req, res) => {
  res.render('logout') 
})

app.get('/logout/confirmar', (req, res) => {
  // borra las cookies al cerrar sesion :P
  res.clearCookie('session_user', { path: '/', httpOnly: true, sameSite: 'lax' })
  console.log('🔸 Sesión cerrada correctamente.')
  res.redirect('/login')
})


//actualizar el saldo de la base de datos 
app.post('/ruleta/actualizar-saldo', isAuthenticated, async (req, res) => {
  const username = req.cookies.session_user;
  const { nuevoSaldo } = req.body;
  
  if (typeof nuevoSaldo !== 'number') {
    return res.json({ success: false, message: 'nuevoSaldo no es un número' });
  }

  try {
    await Usuario.updateOne({ username }, { $set: { saldo: nuevoSaldo } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});


app.use(express.static('public'))


// === Servidor ===
app.listen(port, () => {
    console.log(`App corriendo en http://localhost:${port}`)
})