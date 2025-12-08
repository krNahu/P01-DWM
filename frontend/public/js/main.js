// API Client
const API = {
  baseUrl: 'http://localhost:3000/api',
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Métodos específicos
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  async deposit(amount) {
    return this.request('/transactions/deposit', {
      method: 'POST',
      body: JSON.stringify({ monto: amount })
    });
  },
  
  async withdraw(amount) {
    return this.request('/transactions/withdraw', {
      method: 'POST',
      body: JSON.stringify({ monto: amount })
    });
  },
  
  async getTransactions() {
    return this.request('/transactions');
  },
  
  async placeBet(betData) {
    return this.request('/roulette/bet', {
      method: 'POST',
      body: JSON.stringify(betData)
    });
  },
  
  async getLastNumbers() {
    return this.request('/roulette/last-numbers');
  }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
  console.log('Pocchinko Casino - Aplicación cargada');
  
  // Detectar página actual
  const currentPage = document.body.dataset.page || 
                     window.location.pathname.replace('/', '') || 
                     'home';
  
  // Inicializar módulos según la página
  initializePage(currentPage);
  
  // Configurar formularios AJAX globalmente
  initializeAjaxForms();
});

// Inicializar funcionalidad específica por página
function initializePage(pageName) {
  switch(pageName) {
    case 'login':
      initializeLogin();
      break;
    case 'register':
      initializeRegister();
      break;
    case 'transacciones':
      initializeTransactions();
      break;
    case 'ruleta':
      initializeRoulette();
      break;
    case 'perfil':
      initializeProfile();
      break;
  }
}

// Inicializar formularios AJAX
function initializeAjaxForms() {
  const forms = document.querySelectorAll('form[data-action]');
  
  forms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const action = this.getAttribute('data-action');
      const method = this.getAttribute('data-method') || 'POST';
      const redirect = this.getAttribute('data-redirect');
      const submitBtn = this.querySelector('button[type="submit"]');
      const errorDiv = this.parentElement.querySelector('.error-message') || 
                      document.getElementById(`${this.id}-error`);
      
      // Preparar datos del formulario
      const formData = new FormData(this);
      const data = Object.fromEntries(formData);
      
      // Mostrar estado de carga
      if (submitBtn) {
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';
        
        try {
          // Realizar petición
          const result = await API.request(action, {
            method: method,
            body: JSON.stringify(data)
          });
          
          // Mostrar éxito
          showNotification('Operación exitosa', 'success');
          
          // Redirigir si es necesario
          if (redirect) {
            setTimeout(() => {
              window.location.href = redirect;
            }, 1500);
          }
          
        } catch (error) {
          // Mostrar error
          if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
          } else {
            showNotification(error.message, 'error');
          }
        } finally {
          // Restaurar botón
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  });
}

// Funciones específicas por página
function initializeLogin() {
  console.log('Inicializando página de login');
  // Aquí puedes añadir lógica específica si es necesario
}

function initializeTransactions() {
  console.log('Inicializando página de transacciones');
  
  // Cargar transacciones inicialmente
  loadTransactions();
  
  // Configurar botones de depósito/retiro
  const depositBtn = document.getElementById('btn-depositar');
  const withdrawBtn = document.getElementById('btn-retirar');
  
  if (depositBtn) {
    depositBtn.addEventListener('click', async function() {
      const input = document.getElementById('monto-deposito');
      const amount = parseInt(input.value);
      
      if (!amount || amount < 2500) {
        showNotification('Monto mínimo: 2.500 Gars', 'error');
        return;
      }
      
      try {
        const result = await API.deposit(amount);
        showNotification('Depósito realizado con éxito!', 'success');
        input.value = '';
        updateSaldo(result.nuevoSaldo);
        loadTransactions();
      } catch (error) {
        showNotification(error.message, 'error');
      }
    });
  }
  
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', async function() {
      const input = document.getElementById('monto-retiro');
      const amount = parseInt(input.value);
      
      if (!amount || amount < 5000) {
        showNotification('Monto mínimo: 5.000 Gars', 'error');
        return;
      }
      
      try {
        const result = await API.withdraw(amount);
        showNotification('Retiro realizado con éxito!', 'success');
        input.value = '';
        updateSaldo(result.nuevoSaldo);
        loadTransactions();
      } catch (error) {
        showNotification(error.message, 'error');
      }
    });
  }
  
  async function loadTransactions() {
    try {
      const transactions = await API.getTransactions();
      const tbody = document.querySelector('#transactions-table tbody');
      
      if (tbody) {
        tbody.innerHTML = '';
        
        transactions.forEach(transaction => {
          const row = document.createElement('tr');
          const isDeposit = transaction.tipo === 'Depósito';
          const sign = isDeposit ? '+' : '-';
          const amountClass = isDeposit ? 'monto-deposito' : 'monto-retiro';
          
          row.innerHTML = `
            <td>${transaction.fecha}</td>
            <td class="${amountClass}">${sign}${transaction.monto.toLocaleString('es-CL')} Gars</td>
            <td>${transaction.tipo}</td>
            <td>${transaction.estado || 'Completado'}</td>
          `;
          
          tbody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  }
  
  function updateSaldo(nuevoSaldo) {
    const saldoDisplay = document.getElementById('saldo-display');
    if (saldoDisplay) {
      saldoDisplay.textContent = nuevoSaldo.toLocaleString('es-CL') + ' Gars';
    }
  }
}

function initializeRoulette() {
  console.log('Inicializando página de ruleta');
  // Aquí iría tu código de ruleta adaptado para usar API.placeBet()
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Estilos básicos
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  if (type === 'success') {
    notification.style.backgroundColor = '#28a745';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#dc3545';
  } else {
    notification.style.backgroundColor = '#17a2b8';
  }
  
  document.body.appendChild(notification);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Inyectar estilos para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);