const Usuario = require('../models/usuario');
const Transaccion = require('../models/Transaccion');
const ResultadoRuleta = require('../models/ResultadoRuleta');

// === CONFIGURACIÓN DE TU RULETA (Basada en tu script.js) ===
const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

// Helpers para determinar color según tu diseño
const isRed = (n) => redSet.has(n);
const isGreen = (n) => n === 0;

// 1. OBTENER DATOS (Perfil + Historial + Saldo)
// 1. OBTENER DATOS (Perfil + Historial + ESTADÍSTICAS REALES)
exports.getDatosUsuario = async (req, res) => {
    try {
        const username = req.params.username;
        const user = await Usuario.findOne({ username });
        if(!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Traemos transacciones y últimos juegos (como antes)
        const transacciones = await Transaccion.find({ usuario: username }).sort({ fecha: -1 }).limit(10);
        const ultimosJuegos = await ResultadoRuleta.find({ usuario: username }).sort({ createdAt: -1 }).limit(5);

        // === CÁLCULOS ESTADÍSTICOS REALES ===
        
        // 1. Contar total de partidas jugadas
        const totalPartidas = await ResultadoRuleta.countDocuments({ usuario: username });
        
        // 2. Contar cuántas ganó
        const totalGanadas = await ResultadoRuleta.countDocuments({ usuario: username, gano: true });
        
        // 3. Buscar la jugada con mayor ganancia
        const mejorJugada = await ResultadoRuleta.findOne({ usuario: username, gano: true })
            .sort({ ganancia: -1 }); // Ordenar de mayor a menor
        
        const mayorGanancia = mejorJugada ? mejorJugada.ganancia : 0;

        // 4. Estimar tiempo de juego (Ej: 15 segundos por giro)
        const segundosTotales = totalPartidas * 15; 
        const tiempoEstimado = segundosTotales < 60 
            ? `${segundosTotales} seg` 
            : `${Math.floor(segundosTotales / 60)} min`;

        res.json({ 
            user, 
            transacciones, 
            ultimosJuegos,
            // Enviamos el paquete de estadísticas nuevas
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


// 2. DEPOSITAR Y RETIRAR (Gestión de saldo)
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

        // Actualizamos saldo en BD
        await Usuario.updateOne({ username }, { saldo: nuevoSaldo });
        
        // Guardamos el registro de la transacción
        await Transaccion.create({ usuario: username, monto: montoNum, tipo });

        res.json({ success: true, nuevoSaldo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. GIRAR RULETA (Lógica migrada de tu script.js al Backend)
exports.girarRuleta = async (req, res) => {
    const { username, apuestaTipo, apuestaValor, monto } = req.body;
    
    try {
        const user = await Usuario.findOne({ username });
        
        // 1. Validar saldo antes de jugar
        if (!user || user.saldo < monto) {
            return res.json({ success: false, error: 'Saldo insuficiente' });
        }

        // --- GENERAR RESULTADO RANDOM EN EL SERVIDOR ---
        const numeroGanador = Math.floor(Math.random() * 37); // 0 a 36
        
        // Determinar color ganador usando tus reglas (Verde, Rosado, Morado)
        // Nota: En tu frontend usas 'rosado' para rojo y 'morado' para negro
        const colorGanador = isGreen(numeroGanador) ? 'verde' : (isRed(numeroGanador) ? 'rosado' : 'morado');

        // --- EVALUAR GANANCIA (Tu lógica exacta) ---
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

        // --- ACTUALIZAR SALDO EN MONGO DB ---
        // Primero restamos la apuesta
        let nuevoSaldo = user.saldo - monto;
        
        // Si ganó, sumamos la ganancia + devolvemos la apuesta original
        if (gano) {
            // Nota: Si aposté 1000 a color y gané, recibo 2000 (1000 míos + 1000 ganancia)
            // En tu lógica: ganancia = monto * 2 (2000). 
            // Entonces nuevoSaldo = (Saldo - 1000) + 2000 = Saldo + 1000. Correcto.
            // PERO: Si tu ganancia era neta, ajusta aquí. 
            // Usando tu lógica del script anterior: saldo += ganancia + apuestaActual.monto;
            // Como aquí 'ganancia' ya incluye el multiplicador total según tus ifs anteriores:
            
            // Ajuste fino para coincidir con tu script frontend:
            // En tu script 'color' era monto * 2. Si apuesto 100, gano 200.
            // Si gano: (Saldo - 100) + 200 = Saldo + 100 netos.
            nuevoSaldo += ganancia; 
        }

        await Usuario.updateOne({ username }, { saldo: nuevoSaldo });

        // --- GUARDAR HISTORIAL EN MONGO DB ---
        // Esto es lo que pediste para ver los "últimos números"
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

// ... (aquí arriba está todo tu código de girarRuleta, etc)

// 4. OBTENER SOLO HISTORIAL (Esta es la función que te falta)
exports.obtenerHistorial = async (req, res) => {
    try {
        const username = req.params.username;
        // Importante: Asegúrate de tener importado ResultadoRuleta arriba del todo
        const ResultadoRuleta = require('../models/ResultadoRuleta'); 

        const ultimosJuegos = await ResultadoRuleta.find({ usuario: username })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json(ultimosJuegos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};