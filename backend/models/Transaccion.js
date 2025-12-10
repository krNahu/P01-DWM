const mongoose = require('mongoose');

const TransaccionSchema = new mongoose.Schema({
    usuario: { type: String, required: true }, // Guardamos el username
    monto: Number,
    tipo: { type: String, enum: ['Depósito', 'Retiro'] },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaccion', TransaccionSchema);