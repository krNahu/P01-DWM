const Usuario = require('../models/usuario');
const Transaccion = require('../models/Transaccion');
const ResultadoRuleta = require('../models/ResultadoRuleta');

const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const isRed = (n) => redSet.has(n);
const isGreen = (n) => n === 0;

exports.getDatosUsuario = async (req, res) => {
    try {
        const username = req.params.username;
        const user = await Usuario.findOne({ username });
        if(!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const transacciones = await Transaccion.find({ usuario: username }).sort({ fecha: -1 }).limit(10);
        const ultimosJuegos = await ResultadoRuleta.find({ usuario: username }).sort({ createdAt: -1 }).limit(5);

        // === CÁLCULOS ESTADÍSTICOS REALES ===
        

        const totalPartidas = await ResultadoRuleta.countDocuments({ usuario: username });
        

        const totalGanadas = await ResultadoRuleta.countDocuments({ usuario: username, gano: true });
        
       
        const mejorJugada = await ResultadoRuleta.findOne({ usuario: username, gano: true })
            .sort({ ganancia: -1 }); 
        
        const mayorGanancia = mejorJugada ? mejorJugada.ganancia : 0;

        const segundosTotales = totalPartidas * 15; 
        const tiempoEstimado = segundosTotales < 60 
            ? `${segundosTotales} seg` 
            : `${Math.floor(segundosTotales / 60)} min`;

        res.json({ 
            user, 
            transacciones, 
            ultimosJuegos,
            estadisticas: {
                totalPartidas,
                totalGanadas,
                mayorGanancia,
                tiempoEstimado
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.nuevaTransaccion = async (req, res) => {
    const { username, tipo, monto } = req.body; 
    const montoNum = parseInt(monto);

    if (isNaN(montoNum)) return res.json({ success: false, error: 'Monto inválido' });

    try {
        const user = await Usuario.findOne({ username });
        if(!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        let nuevoSaldo = user.saldo;

        if (tipo === 'Depósito') {
            if (montoNum < 2500) return res.json({ success: false, error: 'Mínimo 2500 Gars' });
            nuevoSaldo += montoNum;
        } else if (tipo === 'Retiro') {
            if (montoNum < 5000) return res.json({ success: false, error: 'Mínimo 5000 Gars' });
            if (user.saldo < montoNum) return res.json({ success: false, error: 'Saldo insuficiente' });
            nuevoSaldo -= montoNum;
        }


        await Usuario.updateOne({ username }, { saldo: nuevoSaldo });
        
        await Transaccion.create({ usuario: username, monto: montoNum, tipo });

        res.json({ success: true, nuevoSaldo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


exports.girarRuleta = async (req, res) => {
    const { username, apuestaTipo, apuestaValor, monto } = req.body;
    
    try {
        const user = await Usuario.findOne({ username });
        
        if (!user || user.saldo < monto) {
            return res.json({ success: false, error: 'Saldo insuficiente' });
        }

        const numeroGanador = Math.floor(Math.random() * 37); // 0 a 36
        
    
        const colorGanador = isGreen(numeroGanador) ? 'verde' : (isRed(numeroGanador) ? 'rosado' : 'morado');

  
        let ganancia = 0;
        let gano = false;

        // Apuesta a Número
        if (apuestaTipo === 'numero' && parseInt(apuestaValor) === numeroGanador) {
            ganancia = monto * 35;
            gano = true;
        }
        // Apuesta a Color
        else if (apuestaTipo === 'color' && apuestaValor === colorGanador) {
            ganancia = monto * 2;
            gano = true;
        }
        // Apuesta a Paridad (Par/Impar)
        else if (apuestaTipo === 'paridad') {
            // El 0 no es ni par ni impar en apuestas de ruleta
            if ((apuestaValor === 'par' && numeroGanador % 2 === 0 && numeroGanador !== 0) ||
                (apuestaValor === 'impar' && numeroGanador % 2 === 1)) {
                ganancia = monto * 2;
                gano = true;
            }
        }
        // Apuesta a Rango (Bajo/Alto)
        else if (apuestaTipo === 'rango') {
            if ((apuestaValor === 'bajo' && numeroGanador >= 1 && numeroGanador <= 18) ||
                (apuestaValor === 'alto' && numeroGanador >= 19 && numeroGanador <= 36)) {
                ganancia = monto * 2;
                gano = true;
            }
        }
        // Apuesta a Docena
        else if (apuestaTipo === 'docena') {
            const docena = parseInt(apuestaValor);
            if ((docena === 1 && numeroGanador >= 1 && numeroGanador <= 12) ||
                (docena === 2 && numeroGanador >= 13 && numeroGanador <= 24) ||
                (docena === 3 && numeroGanador >= 25 && numeroGanador <= 36)) {
                ganancia = monto * 3;
                gano = true;
            }
        }


        else if (apuestaTipo === 'caballo') {

            const numeros = apuestaValor.split('-').map(n => parseInt(n));
            
            if (numeros.includes(numeroGanador)) {
                ganancia = monto * 17; 
                gano = true;
            }
        }
     
        else if (apuestaTipo === 'transversal') {
            const numeros = apuestaValor.split('-').map(n => parseInt(n));
            if (numeros.includes(numeroGanador)) {
                ganancia = monto * 11; 
                gano = true;
            }
        }


        let nuevoSaldo = user.saldo - monto;
        

        if (gano) {
            nuevoSaldo += ganancia; 
        }

        await Usuario.updateOne({ username }, { saldo: nuevoSaldo });

        await ResultadoRuleta.create({
            usuario: username,
            numero: numeroGanador,
            color: colorGanador,
            apuesta: `${apuestaTipo}:${apuestaValor}`,
            monto: monto,
          
ganancia: gano ? ganancia : 0, 

            gano: gano
        });

        // Enviamos la respuesta al frontend
        res.json({
            success: true,
            numeroGanador,
            colorGanador,
            ganancia: gano ? ganancia : 0,
            nuevoSaldo,
            gano
        });

    } catch (error) {
        console.error("Error en ruleta:", error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};



exports.obtenerHistorial = async (req, res) => {
    try {
        const username = req.params.username;
    
        const ResultadoRuleta = require('../models/ResultadoRuleta'); 

        const ultimosJuegos = await ResultadoRuleta.find({ usuario: username })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json(ultimosJuegos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};