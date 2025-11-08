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


  document.querySelectorAll('button[data-apuesta-tipo]').forEach(b => {
    if (!b.classList.contains('num-verde') && !b.classList.contains('num-morado') && !b.classList.contains('num-rosado')) {
      b.addEventListener('click', seleccionarApuesta);
    }
  });

  btnGirar.addEventListener('click', girar);

  let rotacionActual = 0;

  function seleccionarApuesta(e) {
    document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
    const btn = e.target;
    const monto = parseInt(montoEl.value);
    if (isNaN(monto) || monto <= 0 || monto > saldo) {
      mensajeApuesta.textContent = `Monto inválido (máx: ${saldo}€)`;
      return;
    }
    btn.classList.add('apuesta-seleccionada');
    apuestaActual = {
      tipo: btn.dataset.apuestaTipo,
      valor: btn.dataset.valor,
      monto
    };
    mensajeApuesta.textContent = `Apostado ${monto}€ a ${btn.dataset.valor}`;
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

      // Verificar ganancia
      let ganancia = 0;
      let gano = false;
      if (apuestaActual.tipo === 'numero' && parseInt(apuestaActual.valor) === numeroGanador) {
        ganancia = apuestaActual.monto * 35;
        gano = true;
      }
      if (apuestaActual.tipo === 'color' && apuestaActual.valor === colorResultado) {
        ganancia = apuestaActual.monto * 1;
        gano = true;
      }

      if (gano) saldo += ganancia + apuestaActual.monto;

      resultadoEl.innerHTML = gano ? `✅ Ganaste ${ganancia}€` : `❌ Perdiste. Cayó ${numeroGanador} (${colorResultado})`;
      saldoEl.textContent = saldo.toLocaleString('es-CL');

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
