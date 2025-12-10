const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nombre: String,
    correo: String,
    fechaNacimiento: Date,
    saldo: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', UsuarioSchema);