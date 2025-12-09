document.addEventListener('DOMContentLoaded', function() {
  

  const username = window.CURRENT_USER || null;
  const API_URL = 'http://localhost:3000/api'; // Dirección del backend


  const saldoEl = document.querySelector("#saldo");
  const montoEl = document.getElementById('montoApuesta');
  const btnGirar = document.getElementById('btnGirar');
  const resultadoEl = document.getElementById('resultado');
  const mensajeApuesta = document.getElementById('mensajeApuesta');
  const apuestasInternasDiv = document.querySelector('.apuestas-internas');
  const statusEl = document.getElementById('status');
  const wheel = document.getElementById('wheel');


  let saldo = parseInt(saldoEl.textContent.replace(/\./g, '')) || 0;
  let apuestaActual = { tipo: null, valor: null, monto: 0 };
  let spinning = false;
  let currentRotation = 0;
  let lastWinIdx = null;

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


  function actualizarHistorialVisual(numero) {
    const contenedor = document.getElementById('ultimos-numeros');
    if (!contenedor) return;

    // 1. Determinar color y clase
    const colorClass = numero === 0 ? 'verde' : (isRed(numero) ? 'rosado' : 'morado');

    // 2. Crear la bolita nueva
    const nuevoElemento = document.createElement('div');
    nuevoElemento.className = `numero-ruleta numero-${colorClass}`;
    nuevoElemento.textContent = numero;
    
    // Pequeña animación de entrada (opcional)
    nuevoElemento.style.animation = 'aparecer 0.5s ease-out';

    // 3. Insertar lógica
    // Buscamos si hay placeholders (los guiones '-')
    const placeholders = contenedor.querySelectorAll('.numero-placeholder');
    
    if (placeholders.length > 0) {
        // Si hay guiones, insertamos al principio y borramos el último guion
        contenedor.insertBefore(nuevoElemento, contenedor.firstChild);
        contenedor.lastElementChild.remove();
    } else {
        // Si ya está lleno de números, insertamos al principio y borramos el último número real
        contenedor.insertBefore(nuevoElemento, contenedor.firstChild);
        if (contenedor.children.length > 5) {
            contenedor.lastElementChild.remove();
        }
    }
  }


  async function cargarUltimosNumeros() {
    if (!username) return; 

    try {
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
        
        const idx = numbersCW.indexOf(numeroGanador);
        
        // Calculamos el ángulo objetivo.
        const extraTurns = 5 * 360; 
        const randomOffset = (Math.random() - 0.5) * (seg * 0.6); 
        
      
const targetAngle = -(idx * seg) - startAngleColors - (seg / 2);
        
        let nextRotation = currentRotation + extraTurns;
        
        const currentMod = nextRotation % 360;
        const targetMod = (targetAngle % 360 + 360) % 360; 
        
        let diff = targetMod - currentMod;
        if (diff < 0) diff += 360; 
        
        const totalRotation = nextRotation + diff + randomOffset;

        const duration = 4; // segundos
        wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        currentRotation = totalRotation; // Guardar estado para la próxima

  
        const onEnd = () => {
          wheel.removeEventListener('transitionend', onEnd);
          wheel.classList.remove('girando');

          
          const labels = wheel.querySelectorAll('.label');
          if (lastWinIdx !== null && labels[lastWinIdx]) {
            labels[lastWinIdx].classList.remove('win');
          }
          if (labels[idx]) labels[idx].classList.add('win');
          lastWinIdx = idx;

          // Mostrar info
          showResult(numeroGanador);

 
          actualizarHistorialVisual(numeroGanador);


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
          
   
          saldo = data.nuevoSaldo;


          apuestaActual = { tipo: null, valor: null, monto: 0 };
          document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
          btnGirar.disabled = false;
          spinning = false;
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


  inicializarRuleta();
  cargarUltimosNumeros();
});