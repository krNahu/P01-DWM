document.addEventListener('DOMContentLoaded', function() {
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
  let saldo = parseInt(saldoEl.textContent.replace(/\./g, '')) || 0;
  let apuestaActual = { tipo: null, valor: null, monto: 0 };
  let spinning = false;
  let currentRotation = 0;
  let lastWinIdx = null;

  // === CONFIGURACIÓN DE LA RULETA ===
  const numbersCW = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

  const isRed = n => redSet.has(n);
  const isGreen = n => n === 0;

  const seg = 360 / numbersCW.length;
  const startAngleColors = -180;
  const startAngleNumbers = 90;

  // === TOAST KAWAII ===
  function mostrarToast(mensaje, color = "#eaf3c8ff") {
    Toastify({
      text: mensaje,
      duration: 2500,
      gravity: "top",
      position: "right",
      close: false,
      style: {
        background: color,
        color: "#f7f7f7ff",
        borderRadius: "1rem",
        fontWeight: "bold",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
      }
    }).showToast();
  }

  // === INICIALIZAR RULETA ===
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

  function indexAtPointer(rotation) {
    const pointerAngle = 0;
    const rel = ((pointerAngle - rotation - startAngleColors) % 360 + 360) % 360;
    const index = Math.floor(rel / seg) % numbersCW.length;
    return index;
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

  // === SISTEMA DE APUESTAS ===
  async function cargarUltimosNumeros() {
    try {
      const response = await fetch('/api/ultimos-numeros');
      const ultimosNumeros = await response.json();
      
      const contenedor = document.getElementById('ultimos-numeros');
      if (!contenedor) return;
      
      contenedor.innerHTML = '';
      
      if (ultimosNumeros.length === 0) {
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
        elemento.className = `numero-ruleta numero-${resultado.color}`;
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

  // Botones de apuestas
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
      mensajeApuesta.textContent = `Monto inválido (máx: ${saldo.toLocaleString('es-CL')} Gars)`;
      mostrarToast("Monto inválido 💸", "#ff6f61");
      return;
    }
    
    btn.classList.add('apuesta-seleccionada');
    apuestaActual = {
      tipo: btn.dataset.apuestaTipo,
      valor: btn.dataset.valor,
      monto
    };
    mensajeApuesta.textContent = `Apostado ${monto} Gars a ${btn.dataset.valor}`;
    mostrarToast(`✨ Apuesta colocada: ${monto} Gars en ${btn.dataset.valor}`, "#FF5A9B");
  }

  // === FUNCIÓN GIRAR ===
  async function girar() {
    if (!apuestaActual.tipo) {
      mensajeApuesta.textContent = 'Selecciona una apuesta primero';
      mostrarToast("Selecciona una apuesta 🎯", "#ffcc66");
      return;
    }

    if (spinning) return;

    // Restar apuesta del saldo
    saldo -= apuestaActual.monto;
    saldoEl.textContent = saldo.toLocaleString('es-CL');
    btnGirar.disabled = true;
    resultadoEl.textContent = '🎡 Girando...';
    mensajeApuesta.textContent = '';
    spinning = true;
    
    // Efecto visual de giro
    wheel.classList.add('girando');

    const extraTurns = (Math.floor(Math.random() * 4) + 4) * 360;
    const randomAngle = Math.floor(Math.random() * 360);
    const duration = (Math.random() * 2 + 3).toFixed(2);

    currentRotation += (extraTurns + randomAngle);

    wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    const onEnd = async () => {
      wheel.removeEventListener('transitionend', onEnd);
      wheel.classList.remove('girando');

      // Normalizar rotación
      currentRotation = ((currentRotation % 360) + 360) % 360;

      // Determinar número ganador
      const idx = indexAtPointer(currentRotation);
      const numeroGanador = numbersCW[idx];
      const colorResultado = isGreen(numeroGanador) ? 'verde' : 
                           isRed(numeroGanador) ? 'rosado' : 'morado';

      // Marcar visualmente el número ganador
      const labels = wheel.querySelectorAll('.label');
      if (lastWinIdx !== null && labels[lastWinIdx]) {
        labels[lastWinIdx].classList.remove('win');
      }
      if (labels[idx]) labels[idx].classList.add('win');
      lastWinIdx = idx;

      // Mostrar resultado
      showResult(numeroGanador);

      // === CALCULAR GANANCIAS ===
      let ganancia = 0;
      let gano = false;
      
      if (apuestaActual.tipo === 'numero' && parseInt(apuestaActual.valor) === numeroGanador) {
        ganancia = apuestaActual.monto * 35;
        gano = true;
      }
      else if (apuestaActual.tipo === 'color' && apuestaActual.valor === colorResultado) {
        ganancia = apuestaActual.monto * 2;
        gano = true;
      }
      else if (apuestaActual.tipo === 'paridad') {
        if ((apuestaActual.valor === 'par' && numeroGanador % 2 === 0 && numeroGanador !== 0) ||
            (apuestaActual.valor === 'impar' && numeroGanador % 2 === 1)) {
          ganancia = apuestaActual.monto * 2;
          gano = true;
        }
      }
      else if (apuestaActual.tipo === 'rango') {
        if ((apuestaActual.valor === 'bajo' && numeroGanador >= 1 && numeroGanador <= 18) ||
            (apuestaActual.valor === 'alto' && numeroGanador >= 19 && numeroGanador <= 36)) {
          ganancia = apuestaActual.monto * 2;
          gano = true;
        }
      }
      else if (apuestaActual.tipo === 'docena') {
        const docena = parseInt(apuestaActual.valor);
        if ((docena === 1 && numeroGanador >= 1 && numeroGanador <= 12) ||
            (docena === 2 && numeroGanador >= 13 && numeroGanador <= 24) ||
            (docena === 3 && numeroGanador >= 25 && numeroGanador <= 36)) {
          ganancia = apuestaActual.monto * 3;
          gano = true;
        }
      }

      if (gano) {
        saldo += ganancia + apuestaActual.monto;
        resultadoEl.innerHTML = `✅ ¡Ganaste ${ganancia.toLocaleString('es-CL')} Gars!`;
        resultadoEl.style.color = 'green';
        mostrarToast(`🎉 ¡Ganaste ${ganancia.toLocaleString('es-CL')} Gars!`, "#C6F6C1");
      } else {
        resultadoEl.innerHTML = `❌ Perdiste ${apuestaActual.monto.toLocaleString('es-CL')} Gars`;
        resultadoEl.style.color = 'red';
        mostrarToast(`😿 Cayó ${numeroGanador} (${colorResultado})`, "#FF5A9B");
      }

      saldoEl.textContent = saldo.toLocaleString('es-CL');

      // === GUARDAR EN BASE DE DATOS ===
      try {
        const resultadoData = {
          numero: numeroGanador,
          color: colorResultado,
          apuesta: apuestaActual.tipo + ':' + apuestaActual.valor,
          monto: apuestaActual.monto,
          ganancia: gano ? ganancia : 0,
          gano: gano
        };

        const saveResponse = await fetch('/ruleta/guardar-resultado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultadoData)
        });

        const saveResult = await saveResponse.json();
        
        if (saveResult.success) {
          cargarUltimosNumeros();
        }
        
      } catch (err) {
        console.error('Error al guardar resultado:', err);
      }

      // Actualizar saldo en la base de datos
      try {
        const response = await fetch('/ruleta/actualizar-saldo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nuevoSaldo: saldo })
        });
        const data = await response.json();
        if (!data.success) console.error('Error al actualizar saldo:', data.message);
      } catch (err) {
        console.error('Error fetch actualizar saldo:', err);
      }

      // Resetear para siguiente giro
      apuestaActual = { tipo: null, valor: null, monto: 0 };
      document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
      btnGirar.disabled = false;
      spinning = false;

      // Fijar rotación exacta
      wheel.style.transition = 'none';
      wheel.style.transform = `rotate(${currentRotation}deg)`;
      void wheel.offsetWidth; // reflow
    };

    wheel.addEventListener('transitionend', onEnd);
  }

  // === INICIALIZACIÓN ===
  inicializarRuleta();
  cargarUltimosNumeros();
});