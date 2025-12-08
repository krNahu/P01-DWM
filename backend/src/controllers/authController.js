const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// =========================================================
// 🚨 DEFINICIÓN DEL MODELO (SOLUCIÓN DE EMERGENCIA)
// =========================================================
// Esto asegura que el modelo 'Usuario' exista sí o sí,
// sin importar si el archivo externo falla al importarse.
let Usuario;
try {
  // Intentamos recuperar el modelo si Mongoose ya lo conoce
  Usuario = mongoose.model('Usuario');
} catch (error) {
  // Si no existe, lo definimos aquí mismo
  const UsuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    nombre: String,
    correo: String,
    fechaNacimiento: Date,
    saldo: { type: Number, default: 0 }
  }, { timestamps: true });
  
  Usuario = mongoose.model('Usuario', UsuarioSchema);
}
// =========================================================


// ---------------------------------------------------------
// 1. REGISTRO DE USUARIO
// ---------------------------------------------------------
exports.register = async (req, res) => {
  console.log("📥 [Register] Recibiendo datos:", req.body);
  const { username, password, nombre, correo, fechaNacimiento } = req.body;

  // Validación básica
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Verificar si ya existe (por username o correo)
    const existe = await Usuario.findOne({ 
        $or: [{ username: username }, { correo: correo }] 
    });
    
    if (existe) {
      console.log("⚠️ [Register] Usuario duplicado:", username);
      return res.status(400).json({ error: 'El nombre de usuario o correo ya están registrados' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const nuevoUsuario = new Usuario({
      username,
      password: hashedPassword,
      nombre,
      correo,
      fechaNacimiento: new Date(fechaNacimiento),
      saldo: 1000 // Saldo inicial de regalo
    });
    
    await nuevoUsuario.save();
    console.log("✅ [Register] Usuario creado con éxito:", username);
    
    res.status(201).json({ message: 'Usuario registrado con éxito' });
    
  } catch (err) {
    console.error('❌ [Register] Error CRÍTICO:', err);
    res.status(500).json({ error: 'Error interno del servidor al registrar' });
  }
};


// ---------------------------------------------------------
// 2. INICIO DE SESIÓN (LOGIN)
// ---------------------------------------------------------
exports.login = async (req, res) => {
  console.log("🔑 [Login] Intento de acceso:", req.body);
  
  // El frontend envía 'email', pero permitimos que el usuario escriba su username también
  const { email, password } = req.body; 
  
  try {
    // Buscamos por CORREO o por USERNAME
    const usuario = await Usuario.findOne({ 
        $or: [
            { correo: email },
            { username: email } 
        ]
    }).select('+password'); // Necesitamos la contraseña para comparar
    
    // CASO 1: Usuario no encontrado
    if (!usuario) {
      console.log("❌ [Login] Usuario no encontrado:", email);
      return res.status(401).json({ error: 'Usuario o correo no encontrado' });
    }

    // CASO 2: Contraseña incorrecta
    const match = await bcrypt.compare(password, usuario.password);
    if (!match) {
      console.log("❌ [Login] Contraseña incorrecta para:", usuario.username);
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // CASO 3: Éxito
    console.log("✅ [Login] Acceso concedido:", usuario.username);

    // Generar Token JWT
    const token = jwt.sign(
        { id: usuario._id, username: usuario.username }, 
        process.env.SESSION_SECRET || 'SECRET_KEY_SUPER_SECRETA', 
        { expiresIn: '1h' }
    );

    // Respondemos con JSON (El frontend app.js se encarga de poner la cookie)
    res.json({ 
      message: 'Inicio de sesión exitoso',
      token: token,
      user: { 
        username: usuario.username, 
        nombre: usuario.nombre, 
        saldo: usuario.saldo 
      }
    });
    
  } catch (err) {
    console.error('❌ [Login] Error CRÍTICO:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// ---------------------------------------------------------
// 3. CERRAR SESIÓN (LOGOUT)
// ---------------------------------------------------------
exports.logout = (req, res) => {
  // El backend solo confirma. El frontend borrará la cookie.
  res.json({ message: 'Sesión cerrada correctamente' });
};


// ---------------------------------------------------------
// 4. OBTENER PERFIL
// ---------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    // req.user viene del middleware (decodificado del token)
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const user = await Usuario.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        nombre: user.nombre || 'N/A',
        username: user.username,
        correo: user.correo || 'N/A',
        fechaRegistro: user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CL') : 'N/A'
      },
      saldo: user.saldo
    });
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};