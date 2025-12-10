const mongoose = require('mongoose');

const ResultadoRuletaSchema = new mongoose.Schema({
    usuario: String,
    numero: Number,
    color: String,
    ganancia: Number,
    apuesta: String, // Ej: "color:rosado" o "numero:32"
    monto: Number,
    gano: Boolean
}, { timestamps: true }); // createdAt guardará la fecha exacta automáticamente

module.exports = mongoose.model('ResultadoRuleta', ResultadoRuletaSchema);