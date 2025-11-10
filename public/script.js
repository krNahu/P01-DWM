document.addEventListener('DOMContentLoaded', function() {
  const saldoEl = document.querySelector("#saldo");
  const montoEl = document.getElementById('montoApuesta');
  const btnGirar = document.getElementById('btnGirar');
  const ruleta = document.getElementById('ruleta');
  const resultadoEl = document.getElementById('resultado');
  const mensajeApuesta = document.getElementById('mensajeApuesta');
  const apuestasInternasDiv = document.querySelector('.apuestas-internas');

  let saldo = parseInt(saldoEl.textContent.replace(/\./g, '')) || 0;
  let apuestaActual = { tipo: null, valor: null, monto: 0 };

  saldoEl.textContent = saldo.toLocaleString('es-CL');

  // === AGREGAR: Función para cargar últimos números ===
  async function cargarUltimosNumeros() {
    try {
      const response = await fetch('/api/ultimos-numeros');
      const ultimosNumeros = await response.json();
      
      const contenedor = document.getElementById('ultimos-numeros');
      if (!contenedor) {
        console.log('Contenedor de últimos números no encontrado');
        return;
      }
      
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

  // === AGREGAR: Cargar últimos números al iniciar ===
  cargarUltimosNumeros();

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

  // SOLUCIÓN: Solo botones específicos de apuestas
  document.querySelectorAll('.apuestas-externas button, .apuestas-multiples button, .apuestas-internas button').forEach(b => {
    b.addEventListener('click', seleccionarApuesta);
  });

  btnGirar.addEventListener('click', girar);

  let rotacionActual = 0;

  function seleccionarApuesta(e) {
    document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
    const btn = e.target;
    const monto = parseInt(montoEl.value);
    if (isNaN(monto) || monto <= 0 || monto > saldo) {
      mensajeApuesta.textContent = `Monto inválido (máx: ${saldo.toLocaleString('es-CL')} Gars)`;
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
    if (!apuestaActual.tipo) {
      mensajeApuesta.textContent = 'Selecciona una apuesta primero';
      return;
    }

    saldo -= apuestaActual.monto;
    saldoEl.textContent = saldo.toLocaleString('es-CL');
    btnGirar.disabled = true;
    resultadoEl.textContent = '🎡 Girando...';

    const vueltas = Math.floor(Math.random() * 4) + 4;
    const anguloExtra = Math.floor(Math.random() * 360);
    const duracion = (Math.random() * 2 + 3).toFixed(2);
    rotacionActual += vueltas * 360 + anguloExtra;

    ruleta.style.transition = `transform ${duracion}s cubic-bezier(.12,.63,.16,1)`;
    ruleta.style.transform = `rotate(${rotacionActual}deg)`;

    ruleta.addEventListener('transitionend', async () => {
      const anguloFinal = ((rotacionActual % 360) + 360) % 360;
      const sector = Math.floor((360 - anguloFinal) / 10);
      const numeroGanador = sector % 37;
      const colorResultado = numeroGanador === 0 ? 'verde' : numeroGanador % 2 === 0 ? 'morado' : 'rosado';

      // Verificar ganancia - CORREGIDO
      let ganancia = 0;
      let gano = false;
      
      if (apuestaActual.tipo === 'numero' && parseInt(apuestaActual.valor) === numeroGanador) {
        ganancia = apuestaActual.monto * 35;
        gano = true;
      }
      if (apuestaActual.tipo === 'color' && apuestaActual.valor === colorResultado) {
        ganancia = apuestaActual.monto * 2; // CORREGIDO: x2
        gano = true;
      }
      // Aquí deberías agregar lógica para los otros tipos de apuestas

      if (gano) saldo += ganancia + apuestaActual.monto;

      resultadoEl.innerHTML = gano ? `✅ Ganaste ${ganancia} Gars` : `❌ Perdiste. Cayó ${numeroGanador} (${colorResultado})`;
      saldoEl.textContent = saldo.toLocaleString('es-CL');

      // === MODIFICAR: Guardar resultado en la base de datos ===
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
        
        // === AGREGAR: Actualizar últimos números después de guardar ===
        if (saveResult.success) {
          cargarUltimosNumeros();
        }
        
      } catch (err) {
        console.error('Error al guardar resultado:', err);
      }

      // actualizar saldo en la base
      try {
        const response = await fetch('/ruleta/actualizar-saldo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nuevoSaldo: saldo })
        });
        const data = await response.json();
        if (!data.success) console.error('Error al actualizar saldo en servidor:', data.message);
      } catch (err) {
        console.error('Error fetch actualizar saldo:', err);
      }

      apuestaActual = { tipo: null, valor: null, monto: 0 };
      document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
      btnGirar.disabled = false;
      ruleta.style.transition = 'none';
      rotacionActual = anguloFinal;
    }, { once: true });
  }
});