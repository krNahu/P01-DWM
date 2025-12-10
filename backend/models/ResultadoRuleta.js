const mongoose = require('mongoose');

const ResultadoRuletaSchema = new mongoose.Schema({
    usuario: String,
    numero: Number,
    color: String,
    ganancia: Number,
    apuesta: String, 
    monto: Number,
    gano: Boolean
}, { timestamps: true }); 

module.exports = mongoose.model('ResultadoRuleta', ResultadoRuletaSchema);