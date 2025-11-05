let saldo = 1000;
let apuestaActual = { tipo: null, valor: null, monto: 0 };
const btnGirar = document.getElementById('btnGirar');
const ruleta = document.getElementById('ruleta');
const resultadoEl = document.getElementById('resultado');
const saldoEl = document.getElementById('saldo');
const montoEl = document.getElementById('montoApuesta');
const mensajeApuesta = document.getElementById('mensajeApuesta');
const apuestasInternasDiv = document.querySelector('.apuestas-internas');

saldoEl.textContent = saldo;

// Crear botones 0–36
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

// Agregar event listeners a todos los botones de apuesta
document.querySelectorAll('button[data-apuesta-tipo]').forEach(b => {
  b.addEventListener('click', seleccionarApuesta);
});

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
  mensajeApuesta.textContent = `Apostado ${monto}€ a ${obtenerNombreApuesta(btn.dataset.apuestaTipo, btn.dataset.valor)}`;
}

function obtenerNombreApuesta(tipo, valor) {
  const nombres = {
    'numero': `Número ${valor}`,
    'color': `${valor.toUpperCase()}`,
    'paridad': `${valor.toUpperCase()}`,
    'rango': valor === 'bajo' ? '1-18' : '19-36',
    'docena': `${valor}° Docena (${valor === '1' ? '1-12' : valor === '2' ? '13-24' : '25-36'})`,
    'caballo': `Caballo ${valor}`,
    'transversal': `Transversal ${valor}`
  };
  return nombres[tipo] || valor;
}

btnGirar.addEventListener('click', girar);

let rotacionActual = 0;

function girar() {
  if (!apuestaActual.tipo) {
    mensajeApuesta.textContent = 'Selecciona una apuesta primero';
    return;
  }

  saldo -= apuestaActual.monto;
  saldoEl.textContent = saldo;
  btnGirar.disabled = true;
  resultadoEl.textContent = '🎡 Girando...';

  const vueltas = Math.floor(Math.random() * 4) + 4;
  const anguloExtra = Math.floor(Math.random() * 360);
  const duracion = (Math.random() * 2 + 3).toFixed(2);
  rotacionActual += vueltas * 360 + anguloExtra;

  ruleta.style.transition = `transform ${duracion}s cubic-bezier(.12,.63,.16,1)`;
  ruleta.style.transform = `rotate(${rotacionActual}deg)`;

  ruleta.addEventListener('transitionend', () => {
    const anguloFinal = ((rotacionActual % 360) + 360) % 360;
    const sector = Math.floor((360 - anguloFinal) / 10);
    const numeroGanador = sector % 37;

    const colorResultado =
      numeroGanador === 0
        ? 'verde'
        : numeroGanador % 2 === 0
        ? 'morado'
        : 'rosado';

    verificarGanancia(numeroGanador, colorResultado);

    ruleta.style.transition = 'none';
    rotacionActual = anguloFinal;
    btnGirar.disabled = false;
  }, { once: true });
}

function verificarGanancia(num, color) {
  const monto = apuestaActual.monto;
  let ganancia = 0;
  let gano = false;

  switch (apuestaActual.tipo) {
    case 'numero':
      if (parseInt(apuestaActual.valor) === num) {
        ganancia = monto * 35;
        gano = true;
      }
      break;

    case 'color':
      if (apuestaActual.valor === color) {
        ganancia = monto * 1;
        gano = true;
      }
      break;

    case 'paridad':
      const paridad = num === 0 ? 'cero' : num % 2 === 0 ? 'par' : 'impar';
      if (apuestaActual.valor === paridad) {
        ganancia = monto * 1;
        gano = true;
      }
      break;

    case 'rango':
      if ((apuestaActual.valor === 'bajo' && num >= 1 && num <= 18) ||
          (apuestaActual.valor === 'alto' && num >= 19 && num <= 36)) {
        ganancia = monto * 1;
        gano = true;
      }
      break;

    case 'docena':
      const docena = num === 0 ? 0 : Math.ceil(num / 12);
      if (parseInt(apuestaActual.valor) === docena) {
        ganancia = monto * 2;
        gano = true;
      }
      break;

    case 'caballo':
      const numerosCaballo = apuestaActual.valor.split('-').map(n => parseInt(n));
      if (numerosCaballo.includes(num)) {
        ganancia = monto * 17;
        gano = true;
      }
      break;

    case 'transversal':
      const numerosTransversal = apuestaActual.valor.split('-').map(n => parseInt(n));
      if (numerosTransversal.includes(num)) {
        ganancia = monto * 11;
        gano = true;
      }
      break;
  }

  if (gano) {
    saldo += monto + ganancia;
    resultadoEl.innerHTML = `✅ ¡Ganaste! Cayó ${num} (${color.toUpperCase()}) +${ganancia}€`;
  } else {
    resultadoEl.innerHTML = `❌ Perdiste. Cayó ${num} (${color.toUpperCase()})`;
  }

  resultadoEl.className = `resultado-${color}`;
  saldoEl.textContent = saldo;
  apuestaActual = { tipo: null, valor: null, monto: 0 };
  document.querySelectorAll('.apuesta-seleccionada').forEach(b => b.classList.remove('apuesta-seleccionada'));
}