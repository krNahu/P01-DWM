document.addEventListener('DOMContentLoaded', function() {
  
  // === CONFIGURACIÓN GLOBAL ===
  // IMPORTANTE: Asegúrate de definir esta variable en tu vista Handlebars antes de cargar el script
  // <script> window.CURRENT_USER = "{{username}}"; </script>
  const username = window.CURRENT_USER || null;
  const API_URL = 'http://localhost:3000/api'; // Dirección del backend

  // === ELEMENTOS DEL SISTEMA ===
  const saldoEl = document.querySelector("#saldo");
  const montoEl = document.getElementById('montoApuesta');
  const btnGirar = document.getElementById('btnGirar');
  const resultadoEl = document.getElementById('resultado');
  const mensajeApuesta = document.getElementById('mensajeApuesta');
  const apuestasInternasDiv = document.querySelector('.apuestas-internas');
  const statusEl = document.getElementById('status');
  const wheel = document.getElementById('wheel');

  // === VARIABLES DEL SISTEMA ===
  // Leemos el saldo inicial del texto, limpiando puntos si es necesario
  let saldo = parseInt(saldoEl.textContent.replace(/\./g, '')) || 0;
  let apuestaActual = { tipo: null, valor: null, monto: 0 };
  let spinning = false;
  let currentRotation = 0;
  let lastWinIdx = null;

  // === CONFIGURACIÓN DE LA RULETA (MATH) ===
  const numbersCW = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const isRed = n => redSet.has(n);
  const isGreen = n => n === 0;

  const seg = 360 / numbersCW.length;
  const startAngleColors = -180; // Ajuste visual de tu diseño original
  const startAngleNumbers = 90;

  // === INICIALIZACIÓN VISUAL ===
  function inicializarRuleta() {
    paintWheel();
    drawLabels();
    showResult('Listo para jugar');
  }

  function paintWheel(){
    const parts = numbersCW.map((n,i) => {
      const color = isGreen(n) ? 'var(--verde)' : 
                    isRed(n) ? 'var(--rosado)' : 'var(--morado)';
      const from = (i * seg).toFixed(6);
      const to = ((i+1) * seg).toFixed(6);
      return `${color} ${from}deg ${to}deg`;
    });

    const bg = `
      radial-gradient(circle at 50% 50%, #0000 58%, rgba(255,255,255,.06) 58.2% 59%, #0000 59%),
      conic-gradient(from ${startAngleColors}deg, ${parts.join(',')})
    `;
    wheel.style.background = bg;
  }

  function drawLabels(){
    const existingLabels = wheel.querySelector('.labels');
    if (existingLabels) existingLabels.remove();

    const labelsWrap = document.createElement('div');
    labelsWrap.className = 'labels';
    wheel.appendChild(labelsWrap);

    const R = wheel.clientWidth / 2 - 15;

    numbersCW.forEach((n, i) => {
      const label = document.createElement('div');
      label.className = 'label' + (n === 0 ? ' green' : '');
      label.textContent = n;

      const phi = startAngleNumbers + (i + 0.5) * seg;
      const rad = phi * Math.PI / 180;

      const x = Math.cos(rad) * R;
      const y = Math.sin(rad) * R;

      label.style.setProperty('--pos', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`);
      label.style.transform = `translate(-50%, -50%) var(--pos)`;

      labelsWrap.appendChild(label);
    });
  }

  // Utilidad visual para mostrar el chip del resultado
  function showResult(n){
    if (typeof n === 'string') {
      statusEl.innerHTML = n;
      return;
    }
    
    const color = isGreen(n) ? 'VERDE' : (isRed(n) ? 'Rosado' : 'Morado');
    const dotClass = isGreen(n) ? 'dot-green' : (isRed(n) ? 'dot-red' : 'dot-black');
    statusEl.innerHTML = `
      <span class="result-chip" role="status">
        <span class="result-dot ${dotClass}"></span>
        ${n} — ${color}
      </span>
    `;
  }

  // === SISTEMA DE CARGA DE DATOS (FETCH AL BACKEND) ===
  async function cargarUltimosNumeros() {
    if (!username) return; // Si no hay usuario logueado, no carga

    try {
      // Nota: Aquí llamamos al endpoint del Backend
      const response = await fetch(`${API_URL}/user/${username}`);
      // Asumimos que el backend devuelve { user: {...}, transacciones: [...], ultimosJuegos: [...] }
      // Si tu endpoint es distinto, ajusta aquí.
      // Para simplificar, usaremos el endpoint de ultimos numeros si lo tienes separado
      // O usaremos el endpoint que creaste: /api/ultimos-numeros (pero ahora vive en puerto 3000)
      
      // Ajuste para la estructura sugerida:
      // Vamos a asumir que tienes una ruta específica o extraemos del perfil.
      // Si no, puedes dejar esto vacío o implementar la ruta en el backend.
      
      // Simularemos que el backend tiene esta ruta específica:
      const historialResponse = await fetch(`${API_URL}/historial/${username}`); 
      if (!historialResponse.ok) return;

      const ultimosNumeros = await historialResponse.json();
      
      const contenedor = document.getElementById('ultimos-numeros');
      if (!contenedor) return;
      
      contenedor.innerHTML = '';
      
      if (!ultimosNumeros || ultimosNumeros.length === 0) {
        for (let i = 0; i < 5; i++) {
          const placeholder = document.createElement('div');
          placeholder.className = 'numero-placeholder';
          placeholder.textContent = '-';
          contenedor.appendChild(placeholder);
        }
        return;
      }
      
      ultimosNumeros.forEach(resultado => {
        const elemento = document.createElement('div');
        const colorClass = resultado.numero === 0 ? 'verde' : (isRed(resultado.numero) ? 'rosado' : 'morado');
        elemento.className = `numero-ruleta numero-${colorClass}`;
        elemento.textContent = resultado.numero;
        
        if (resultado.gano) {
          elemento.style.border = '2px solid gold';
          elemento.title = '¡Ganó esta ronda!';
        }
        contenedor.appendChild(elemento);
      });
      
    } catch (error) {
      console.error('Error al cargar últimos números:', error);
    }
  }

  // === INTERACCIÓN DE BOTONES ===

  // Crear botones internos 0–36
  for (let i = 0; i <= 36; i++) {
    const btn = document.createElement('button');
    const color = i === 0 ? 'verde' : i % 2 === 0 ? 'morado' : 'rosado';
    btn.textContent = i;
    btn.classList.add(`num-${color}`);
    btn.dataset.apuestaTipo = 'numero';
    btn.dataset.valor = i;
    btn.addEventListener('click', seleccionarApuesta);
    apuestasInternasDiv.appendChild(btn);
  }

  // Botones de apuestas externas
  document.querySelectorAll('.apuestas-externas button, .apuestas-multiples button, .apuestas-internas button').forEach(b => {
    b.addEventListener('click', seleccionarApuesta);
  });

  btnGirar.addEventListener('click', girar);

  function seleccionarApuesta(e) {
    if (spinning) return;
    
    document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
    const btn = e.target;
    const monto = parseInt(montoEl.value);
    
    if (isNaN(monto) || monto <= 0 || monto > saldo) {
      mensajeApuesta.textContent = `Monto inválido o insuficiente (Saldo: ${saldo.toLocaleString('es-CL')} Gars)`;
      return;
    }
    
    btn.classList.add('apuesta-seleccionada');
    apuestaActual = {
      tipo: btn.dataset.apuestaTipo,
      valor: btn.dataset.valor,
      monto
    };
    mensajeApuesta.textContent = `Apostado ${monto} Gars a ${btn.dataset.valor}`;
  }

  // === LÓGICA CORE: GIRAR CON BACKEND ===
  async function girar() {
    if (!username) {
        mensajeApuesta.textContent = 'Error de sesión. Recarga la página.';
        return;
    }
    if (!apuestaActual.tipo) {
      mensajeApuesta.textContent = 'Selecciona una apuesta primero';
      return;
    }

    if (spinning) return;

    // Bloquear UI
    btnGirar.disabled = true;
    resultadoEl.textContent = '📡 Conectando con el servidor...';
    mensajeApuesta.textContent = '';
    
    try {
        // 1. SOLICITUD AL BACKEND (Puerto 3000)
        const response = await fetch(`${API_URL}/ruleta/girar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                apuestaTipo: apuestaActual.tipo,
                apuestaValor: apuestaActual.valor,
                monto: apuestaActual.monto
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error en el servidor');
        }

        // Si llegamos aquí, la apuesta fue aceptada y procesada
        spinning = true;
        
        // Actualizamos saldo visualmente (aunque el real llega al final)
        saldoEl.textContent = (saldo - apuestaActual.monto).toLocaleString('es-CL');
        wheel.classList.add('girando');

        // 2. CALCULAR ANIMACIÓN PARA EL NÚMERO GANADOR (DETERMINADO POR EL SERVER)
        const numeroGanador = data.numeroGanador; // Viene del backend
        
        // Lógica inversa: ¿Dónde está ese número en el array?
        const idx = numbersCW.indexOf(numeroGanador);
        
        // Calculamos el ángulo objetivo.
        // La rueda tiene 'seg' grados por número.
        // Queremos que el número quede arriba (bajo el puntero).
        // Ajustamos con startAngleColors para coincidir con tu sistema de coordenadas.
        
        const extraTurns = 5 * 360; // 5 vueltas completas para emoción
        const randomOffset = (Math.random() - 0.5) * (seg * 0.6); // Pequeña variabilidad dentro de la casilla
        
        // El ángulo "base" donde está el número actualmente (sin rotación)
        // Nota: Esta fórmula depende de cómo pintaste el gradiente cónico.
        // Si el índice 0 está en 0 grados, rotar -index * seg lo lleva al origen.
        // Ajustamos la dirección de giro y el offset inicial.
        
        const targetAngle = -(idx * seg) - startAngleColors; 
        
        // Calculamos la rotación final total asegurando que sea mayor a la actual
        // para que gire en sentido horario (o el que defina tu CSS transition)
        let nextRotation = currentRotation + extraTurns;
        
        // Ajuste fino para caer en el targetAngle
        // (nextRotation % 360) es donde estamos visualmente.
        // Queremos llegar a (targetAngle % 360).
        
        const currentMod = nextRotation % 360;
        const targetMod = (targetAngle % 360 + 360) % 360; // Normalizar positivo
        
        let diff = targetMod - currentMod;
        if (diff < 0) diff += 360; // Asegurar giro positivo
        
        const totalRotation = nextRotation + diff + randomOffset;

        // 3. EJECUTAR ANIMACIÓN CSS
        const duration = 4; // segundos
        wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        currentRotation = totalRotation; // Guardar estado para la próxima

        // 4. AL TERMINAR LA ANIMACIÓN
        const onEnd = () => {
          wheel.removeEventListener('transitionend', onEnd);
          wheel.classList.remove('girando');

          // Marcar visualmente el número
          const labels = wheel.querySelectorAll('.label');
          if (lastWinIdx !== null && labels[lastWinIdx]) {
            labels[lastWinIdx].classList.remove('win');
          }
          // El índice visual puede diferir ligeramente por el offset, pero sabemos el ganador real
          if (labels[idx]) labels[idx].classList.add('win');
          lastWinIdx = idx;

          // Mostrar info
          showResult(numeroGanador);

          // 5. ACTUALIZAR UI CON DATOS DEL BACKEND
          if (data.gano) {
            saldoEl.textContent = data.nuevoSaldo.toLocaleString('es-CL');
            resultadoEl.innerHTML = `✅ ¡Ganaste ${data.ganancia.toLocaleString('es-CL')} Gars!`;
            resultadoEl.style.color = 'green';
            mostrarGifGanador(data.ganancia);
          } else {
            saldoEl.textContent = data.nuevoSaldo.toLocaleString('es-CL');
            resultadoEl.innerHTML = `❌ Perdiste ${apuestaActual.monto.toLocaleString('es-CL')} Gars`;
            resultadoEl.style.color = 'red';
          }
          
          // Actualizar variable local de saldo
          saldo = data.nuevoSaldo;

          // Resetear estados
          apuestaActual = { tipo: null, valor: null, monto: 0 };
          document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
          btnGirar.disabled = false;
          spinning = false;
          
          // Actualizar historial visualmente
          cargarUltimosNumeros();
        };

        wheel.addEventListener('transitionend', onEnd);

    } catch (err) {
        console.error(err);
        resultadoEl.textContent = '❌ Error de comunicación con el servidor';
        mensajeApuesta.textContent = err.message;
        btnGirar.disabled = false;
        spinning = false;
        wheel.classList.remove('girando');
    }
  }

  // === EFECTOS VISUALES EXTRA ===
  function mostrarGifGanador(ganancia) {
    const gifGanador = document.getElementById('ganador-gif');
    if(!gifGanador) return;
    
    const ganadorText = gifGanador.querySelector('.ganador-text');
    if(ganadorText) {
        ganadorText.textContent = `¡FELICIDADES, GANASTE ${ganancia.toLocaleString('es-CL')} GARS! 🎉`;
    }
    
    gifGanador.classList.remove('ganador-hidden');
    
    setTimeout(() => {
        gifGanador.classList.add('ganador-hidden');
    }, 3000);
  }

  // === INICIALIZACIÓN FINAL ===
  inicializarRuleta();
  cargarUltimosNumeros();
});