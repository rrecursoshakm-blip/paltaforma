// =============================================
// AKM HR Platform — Dashboard Logic
// =============================================

// === Auth Check — works with file:// and http:// ===
const _stored = localStorage.getItem('akm_user') || sessionStorage.getItem('akm_user');
const currentUser = _stored ? JSON.parse(_stored) : { name:'Admin AKM', email:'admin@akm.com', role:'admin', avatar:'A' };

// === Access Control UI ===
function applyAccessControl() {
  const isColab = currentUser.role === 'colab';
  
  // Sidebar links control
  const adminOnlyPages = ['employees', 'payroll', 'analytics', 'recruitment', 'training', 'performance'];
  adminOnlyPages.forEach(p => {
    const item = document.querySelector(`[onclick="switchPage('${p}')"]`);
    if (item && isColab) item.style.display = 'none';
  });

  // Specific buttons/actions
  if (isColab) {
    const adminBtns = document.querySelectorAll('#addEmpBtn, .btn-primary:not(#btnCheckIn)');
    adminBtns.forEach(b => b.style.display = 'none');
    
    // Org chart read-only (handled in renderOrgChart)
    // Simplify Home if colab
    if (document.getElementById('homeStats')) renderColaboradorHome();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyAccessControl();
});

function logout() {
  localStorage.removeItem('akm_user');
  sessionStorage.removeItem('akm_user');
  window.location.href = 'login.html';
}

// === Greeting ===
const hour = new Date().getHours();
const gText = hour < 12 ? 'Buenos días ☀️' : hour < 18 ? 'Buenas tardes 🌤️' : 'Buenas noches 🌙';
document.getElementById('greetingText').textContent = gText;
document.getElementById('welcomeName').textContent = 'Bienvenido, ' + (currentUser ? currentUser.name : 'Usuario');

// === Page Titles ===
const pageTitles = {
  home: ['Inicio', 'Panel principal'],
  employees: ['Colaboradores', 'Gestión de personas'],
  payroll: ['Planillas', 'Abril 2025'],
  attendance: ['Asistencia', 'Control diario'],
  documents: ['Documentos', 'Gestión documental'],
  performance: ['Desempeño', 'Evaluaciones Q1'],
  training: ['Capacitaciones', 'Centro de aprendizaje'],
  analytics: ['Analítica', 'Indicadores de talento'],
  recruitment: ['Reclutamiento', 'Portal de vacantes'],
  aichat: ['AKM AI', 'Asistente inteligente'],
  org: ['Mi Organización', 'Estructura jerárquica']
};

// === Switch Page ===
function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById('page-' + id);
  if (page) {
    page.classList.remove('hidden');
    if (id === 'aichat') page.style.display = 'flex';
  }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${id}"]`);
  if (navItem) navItem.classList.add('active');
  const t = pageTitles[id] || ['', ''];
  document.getElementById('pageTitle').innerHTML = t[0] + ' <span>' + t[1] + '</span>';
  // Trigger renders on first visit
  if (id === 'analytics' && !window._analyticsRendered) renderAnalytics();
  if (id === 'performance' && !window._perfRendered) renderPerformance();
  if (id === 'recruitment' && !window._recRendered) renderRecruitment();
  if (id === 'attendance') startLocationTracking();
  if (id === 'analytics' && !window._chartRiskRendered) renderRiskAI();
  if (id === 'org' && !window._orgRendered) renderOrgChart();
}

// === NOTIFICATION SYSTEM ===
let notifications = JSON.parse(localStorage.getItem('akm_notifications')) || [
  { id:1, type:'info', msg:'Bienvenido a AKM. Tu perfil ha sido configurado.', time:'Hace 2 horas', read:false },
  { id:2, type:'success', msg:'Tu nómina de Marzo ha sido procesada.', time:'Hace 1 día', read:false }
];

function addNotification(type, msg) {
  const newNotif = {
    id: Date.now(),
    type: type, // 'warning', 'success', 'info', 'danger'
    msg: msg,
    time: 'Ahora',
    read: false
  };
  notifications.unshift(newNotif);
  localStorage.setItem('akm_notifications', JSON.stringify(notifications));
  renderNotifBadge();
}

function renderNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}
renderNotifBadge();

const notifBtn = document.getElementById('notifBtn');
if (notifBtn) {
  notifBtn.onclick = (e) => {
    e.stopPropagation();
    toggleNotifications();
  };
}

function toggleNotifications() {
  const existing = document.querySelector('.notif-dropdown');
  if (existing) {
    existing.remove();
    return;
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'notif-dropdown';
  dropdown.innerHTML = `
    <div class="notif-header">
      <span>Notificaciones</span>
      <button onclick="markAllRead()" style="background:none;border:none;color:var(--akm-blue-light);font-size:12px;cursor:pointer;">Marcar todas como leídas</button>
    </div>
    <div style="max-height:400px;overflow-y:auto;">
      ${notifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <div class="notif-icon-wrap" style="background:${n.type === 'warning' ? '#fef3c7' : '#e0f2fe'}; color:${n.type === 'warning' ? '#d97706' : '#0ea5e9'};">
            ${n.type === 'warning' ? '⚠️' : '🔔'}
          </div>
          <div style="flex:1">
            <div class="notif-text">${n.msg}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  notifBtn.appendChild(dropdown);
  
  // Close on click outside
  document.addEventListener('click', closeNotifs);
}

function closeNotifs() {
  const existing = document.querySelector('.notif-dropdown');
  if (existing) existing.remove();
  document.removeEventListener('click', closeNotifs);
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  localStorage.setItem('akm_notifications', JSON.stringify(notifications));
  renderNotifBadge();
  closeNotifs();
}

// === Data State — Persistent with localStorage ===
const defaultEmployees = [
  { id:1, name:'María García', email:'mgarcia@akm.com', password:'akmmargar', role:'admin', cargo:'Gerente de RRHH', area:'Recursos Humanos', status:'active', date:'15/01/2020', salary:8500, color:'#6366f1', contractEnd:'2025-04-10', supervisor:null },
  { id:2, name:'Carlos López', email:'clopez@akm.com', password:'akmcarlope', role:'colab', cargo:'Analista de Nóminas', area:'Finanzas', status:'active', date:'03/06/2021', salary:5200, color:'#f97316', contractEnd:'2025-12-31', supervisor:1 },
  { id:3, name:'Ana Torres', email:'atorres@akm.com', password:'akmanatorr', role:'colab', cargo:'Coordinadora de Capacitación', area:'Desarrollo', status:'active', date:'12/03/2022', salary:6100, color:'#ec4899', contractEnd:'2025-08-15', supervisor:1 },
  { id:4, name:'Pedro Ramírez', email:'pramirez@akm.com', password:'akmpedrami', role:'colab', cargo:'Jefe de TI', area:'Tecnología', status:'active', date:'08/09/2019', salary:9200, color:'#14b8a6', contractEnd:'2025-11-20', supervisor:null },
  { id:5, name:'Lucía Mendoza', email:'lmendoza@akm.com', password:'akmlucmend', role:'colab', cargo:'Asistenta Social', area:'Bienestar', status:'vacation', date:'22/11/2021', salary:4800, color:'#f59e0b', contractEnd:'2025-07-01', supervisor:1 }
];

let employees = JSON.parse(localStorage.getItem('akm_employees')) || defaultEmployees;

// Check for expirations on loud
function checkContractExpirations() {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  employees.forEach(emp => {
    const end = new Date(emp.contractEnd);
    if (end > today && end <= thirtyDaysFromNow) {
      const alreadyNotified = notifications.some(n => n.msg.includes(emp.name) && n.type === 'danger');
      if (!alreadyNotified) {
        addNotification('danger', `🚨 **Contrato por vencer:** El contrato de **${emp.name}** vence el ${emp.contractEnd}. ¡Requiere revisión de RRHH!`);
      }
    }
  });
}
setTimeout(checkContractExpirations, 2000);

function saveToStorage() {
  localStorage.setItem('akm_employees', JSON.stringify(employees));
}

const statusLabels = { active:'Activo', vacation:'Vacaciones', inactive:'Inactivo' };
const statusBadge = { active:'badge-success', vacation:'badge-warning', inactive:'badge-danger' };

// === Render Stats Helper ===
function renderStats(containerId, stats) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon-wrap ${s.color}"><span style="font-size:24px">${s.icon}</span></div>
      <div class="stat-info">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        ${s.change ? `<div class="stat-change ${s.changeDir}">${s.changeDir === 'up' ? '↑' : '↓'} ${s.change}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// === Global Update Function ===
function updateAllDashboardData() {
  saveToStorage();
  renderEmployees();
  renderHomeStats();
  renderEmployeeStats();
  renderPayrollStats();
  renderPayrollTable();
}

// === HOME PAGE ===
function renderHomeStats() {
  const activeCount = employees.filter(e => e.status === 'active').length;
  const vacationCount = employees.filter(e => e.status === 'vacation').length;
  renderStats('homeStats', [
    { icon:'👥', label:'Total Colaboradores', value: employees.length, color:'blue', change:'+5 este mes', changeDir:'up' },
    { icon:'✅', label:'Presentes Hoy', value: activeCount, color:'green', change:'87.5%', changeDir:'up' },
    { icon:'🏖️', label:'En Vacaciones', value: vacationCount, color:'yellow' },
    { icon:'📄', label:'Docs Pendientes', value:'12', color:'red', change:'3 urgentes', changeDir:'down' }
  ]);
}
renderHomeStats();

// Attendance today chart
const ctxAttend = document.getElementById('chartAttendToday');
if (ctxAttend) {
  new Chart(ctxAttend, {
    type: 'doughnut',
    data: {
      labels: ['Presentes', 'Ausentes', 'Tardanzas', 'Vacaciones'],
      datasets: [{ data: [112, 4, 4, 8], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#38bdf8'], borderWidth: 0, borderRadius: 4 }]
    },
    options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { family:'Inter', size:12 } } } } }
  });
}

// Recent Activity
const activities = [
  { icon:'👤', text:'<strong>Carmen Rojas</strong> completó su proceso de onboarding', time:'Hace 15 min', color:'#dcfce7' },
  { icon:'📄', text:'<strong>Roberto Díaz</strong> firmó contrato de renovación', time:'Hace 1 hora', color:'#e0f2fe' },
  { icon:'🎓', text:'<strong>Ana Torres</strong> completó curso "Liderazgo Efectivo"', time:'Hace 2 horas', color:'#f3e8ff' },
  { icon:'💰', text:'Planilla de Marzo procesada exitosamente', time:'Ayer', color:'#fef3c7' },
  { icon:'📊', text:'Evaluación Q1 2025 — 85% completada', time:'Hace 2 días', color:'#fce7f3' }
];
const actEl = document.getElementById('recentActivity');
if (actEl) {
  actEl.innerHTML = activities.map(a => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--gray-100)">
      <div style="width:38px;height:38px;border-radius:10px;background:${a.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${a.icon}</div>
      <div style="flex:1"><div style="font-size:13px;color:var(--gray-700);line-height:1.5">${a.text}</div><div style="font-size:11px;color:var(--gray-400);margin-top:2px">${a.time}</div></div>
    </div>
  `).join('');
}

// === EMPLOYEES PAGE ===
function renderEmployeeStats() {
  renderStats('empStats', [
    { icon:'👥', label:'Total', value: employees.length, color:'blue' },
    { icon:'✅', label:'Activos', value: employees.filter(e => e.status === 'active').length, color:'green' },
    { icon:'🏖️', label:'Vacaciones', value: employees.filter(e => e.status === 'vacation').length, color:'yellow' },
    { icon:'🚫', label:'Inactivos', value: employees.filter(e => e.status === 'inactive').length, color:'red' }
  ]);
}

function renderEmployees(filterStatus = 'all') {
  const empTbody = document.querySelector('#employeeTable tbody');
  if (!empTbody) return;
  
  const filtered = filterStatus === 'all' 
    ? employees 
    : employees.filter(e => e.status === filterStatus);

  empTbody.innerHTML = filtered.map(e => `
    <tr>
      <td><div class="emp-cell"><div class="emp-avatar" style="background:${e.color || '#6366f1'}">${e.name.split(' ').map(w=>w[0]).join('')}</div><div><div class="font-semibold" style="color:var(--gray-800)">${e.name}</div><div class="text-xs text-gray">${e.cargo}</div></div></div></td>
      <td class="text-xs font-mono" style="color:var(--akm-blue-light)">${e.email || '---'}</td>
      <td>${e.cargo}</td><td><span class="badge badge-blue">${e.area}</span></td>
      <td><span class="badge ${statusBadge[e.status]}">${statusLabels[e.status]}</span></td>
      <td class="text-gray">${e.date}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openEmpModal(${e.id})" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" onclick="deleteEmployee(${e.id})" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `).join('');
  renderEmployeeStats();
}
renderEmployees();

function exportEmployees() {
  const headers = ['Nombre', 'Cargo', 'Area', 'Estado', 'Sueldo', 'Fecha Ingreso'];
  const rows = employees.map(e => [e.name, e.cargo, e.area, e.status, e.salary, e.date]);
  
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "colaboradores_akm.csv");
  document.body.appendChild(link);
  link.click();
  addNotification('success', 'Lista de colaboradores exportada a CSV.');
}

function toggleFilters() {
  const current = employees.filter(e => e.status === 'active').length;
  // Implementación simple de toggle de filtro circular: All -> Active -> Vacation -> Inactive -> All
  if (!window._currentFilter) window._currentFilter = 'all';
  
  const nextFilter = { 'all': 'active', 'active': 'vacation', 'vacation': 'inactive', 'inactive': 'all' };
  window._currentFilter = nextFilter[window._currentFilter];
  
  const labels = { 'all': 'Todos', 'active': 'Activos', 'vacation': 'Vacaciones', 'inactive': 'Inactivos' };
  alert(`Filtrando por: ${labels[window._currentFilter]}`);
  renderEmployees(window._currentFilter);
}

function exportPayroll() {
  alert('Generando PDF de Planilla... \n(Simulación de descarga de boletas masivas)');
  addNotification('info', 'Reporte de planilla generado y listo para descarga.');
}

function downloadAttendanceReport() {
  const headers = ['Usuario', 'Tipo', 'Hora', 'Fecha', 'Distancia'];
  const rows = attendanceLogs.map(l => [l.userId, l.type, l.time, l.date, l.dist + 'm']);
  
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "asistencia_akm.csv");
  document.body.appendChild(link);
  link.click();
  addNotification('success', 'Reporte de asistencia descargado.');
}

// === PAYROLL PAGE ===
function renderPayrollStats() {
  const totalBruto = employees.reduce((s,e)=>s+e.salary,0);
  renderStats('payrollStats', [
    { icon:'💵', label:'Total Bruto', value:'S/ ' + totalBruto.toLocaleString(), color:'blue' },
    { icon:'📉', label:'Descuentos', value:'S/ ' + Math.round(totalBruto*0.13).toLocaleString(), color:'red' },
    { icon:'💰', label:'Neto Total', value:'S/ ' + Math.round(totalBruto*0.87).toLocaleString(), color:'green' },
    { icon:'📋', label:'Boletas', value: employees.length + '/' + employees.length, color:'yellow' }
  ]);
}

function renderPayrollTable() {
  const payTbody = document.querySelector('#payrollTable tbody');
  if (!payTbody) return;
  payTbody.innerHTML = employees.map(e => {
    const bono = Math.round(e.salary * 0.05); // Fixed for demo simplicity
    const desc = Math.round((e.salary+bono) * 0.13);
    const neto = e.salary + bono - desc;
    return `<tr>
      <td><div class="emp-cell"><div class="emp-avatar" style="background:${e.color || '#6366f1'}">${e.name.split(' ').map(w=>w[0]).join('')}</div><div class="font-semibold" style="color:var(--gray-800)">${e.name}</div></div></td>
      <td>S/ ${e.salary.toLocaleString()}</td><td>S/ ${bono.toLocaleString()}</td><td style="color:var(--color-danger)">-S/ ${desc.toLocaleString()}</td>
      <td class="font-bold">S/ ${neto.toLocaleString()}</td>
      <td><span class="badge badge-success">Pagado</span></td>
    </tr>`;
  }).join('');
  renderPayrollStats();
}
renderPayrollTable();

// === ATTENDANCE PAGE ===
// === ATTENDANCE PAGE (GPS & GEOFENCING) ===
const OFFICE_LAT = -12.225127;
const OFFICE_LNG = -76.971467;
const MAX_DISTANCE = 500; // metros (incrementado)

let attendanceLogs = JSON.parse(localStorage.getItem('akm_attendance_logs')) || [];

function startLocationTracking() {
  if (!navigator.geolocation) {
    updateLocationUI('Error', 'Geolocalización no soportada.', 'danger');
    return;
  }

  // Update clock every second
  if (!window._clockInterval) {
    window._clockInterval = setInterval(() => {
      const now = new Date();
      const clock = document.getElementById('bigClock');
      if (clock) clock.textContent = now.toLocaleTimeString();
    }, 1000);
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      const isNear = dist <= MAX_DISTANCE;
      
      const beacon = document.getElementById('beacon');
      const statusText = document.getElementById('locationStatus');
      const distInfo = document.getElementById('distanceInfo');
      const btnIn = document.getElementById('btnCheckIn');
      const btnOut = document.getElementById('btnCheckOut');

      if (isNear) {
        beacon.className = 'beacon success';
        statusText.innerHTML = '<div class="beacon success"></div> En el local ✅';
        statusText.style.color = 'var(--color-success)';
        distInfo.textContent = `Estás a ${Math.round(dist)}m de la oficina. (Radio permitido: ${MAX_DISTANCE}m)`;
        
        [btnIn, btnOut].forEach(btn => {
          if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.innerHTML = btn.id === 'btnCheckIn' ? '📥 Marcar Ingreso' : '📤 Marcar Salida';
            btn.className = 'btn btn-primary';
          }
        });
      } else {
        beacon.className = 'beacon danger';
        statusText.innerHTML = '<div class="beacon danger"></div> Fuera del local ❌';
        statusText.style.color = 'var(--color-danger)';
        distInfo.textContent = `Estás a ${Math.round(dist)}m de la oficina (Excede los ${MAX_DISTANCE}m).`;
        
        [btnIn, btnOut].forEach(btn => {
          if (btn) {
            btn.disabled = false; // Permitimos click para enviar alerta
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.innerHTML = btn.id === 'btnCheckIn' ? '⚠️ Solicitar Ingreso' : '⚠️ Solicitar Salida';
            btn.className = 'btn btn-outline';
          }
        });
      }
      
      window._currentDistance = Math.round(dist);
      window._isNear = isNear;
      checkAlreadyMarked();
    },
    (err) => {
      updateLocationUI('Error', 'No se pudo obtener la ubicación.', 'danger');
    },
    { enableHighAccuracy: true }
  );
}

function updateLocationUI(title, msg, type) {
  const status = document.getElementById('locationStatus');
  if (status) {
    status.textContent = title;
    status.className = 'beacon ' + type;
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const dPhi = (lat2-lat1) * Math.PI/180;
  const dLam = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLam/2) * Math.sin(dLam/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

function markAttendance(type) {
  if (!window._isNear) {
    const motive = prompt(`⚠️ Estás fuera del radio (${window._currentDistance}m). \n\nEscribe el motivo del marcado remoto para alertar al administrador:`, 'Visita a cliente / Teletrabajo');
    if (!motive) return;
    
    addNotification('warning', `<strong>${currentUser.name}</strong> marcó ${type} fuera de radio (${window._currentDistance}m). Motivo: ${motive}`);
  }

  const now = new Date();
  const log = {
    userId: currentUser.name,
    type: type, // 'ingreso' or 'salida'
    time: now.toLocaleTimeString(),
    date: now.toLocaleDateString(),
    timestamp: now.getTime(),
    isRemote: !window._isNear,
    dist: window._currentDistance
  };

  attendanceLogs.push(log);
  localStorage.setItem('akm_attendance_logs', JSON.stringify(attendanceLogs));
  
  alert(`✅ ${type.toUpperCase()} registrado con éxito.`);
  checkAlreadyMarked();
  renderTodayAttendance();
}

function checkAlreadyMarked() {
  const today = new Date().toLocaleDateString();
  const logsToday = attendanceLogs.filter(l => l.date === today && l.userId === currentUser.name);
  
  const hasIn = logsToday.some(l => l.type === 'ingreso');
  const hasOut = logsToday.some(l => l.type === 'salida');

  const btnIn = document.getElementById('btnCheckIn');
  const btnOut = document.getElementById('btnCheckOut');

  if (hasIn && btnIn) {
    btnIn.disabled = true;
    btnIn.textContent = '✅ Ingreso Marcado';
    btnIn.style.background = 'var(--gray-200)';
    btnIn.style.color = 'var(--gray-500)';
  }
  if (hasOut && btnOut) {
    btnOut.disabled = true;
    btnOut.textContent = '✅ Salida Marcada';
    btnOut.style.background = 'var(--gray-200)';
    btnOut.style.color = 'var(--gray-500)';
  }
}

function renderTodayAttendance() {
  const container = document.getElementById('todayAttendList');
  if (!container) return;

  const today = new Date().toLocaleDateString();
  const logsToday = attendanceLogs.filter(l => l.date === today);

  container.innerHTML = logsToday.length > 0 ? logsToday.map(l => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--gray-100);">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:32px; height:32px; border-radius:50%; background:var(--gray-100); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">${l.userId[0]}</div>
        <div>
          <div style="font-size:14px; font-weight:600;">${l.userId}</div>
          <div style="font-size:12px; color:var(--gray-400);">${l.type === 'ingreso' ? '📥 Ingreso' : '📤 Salida'}</div>
        </div>
      </div>
      <div style="font-size:14px; font-weight:700; color:var(--akm-blue-light);">${l.time}</div>
    </div>
  `).join('') : '<div style="padding:20px; text-align:center; color:var(--gray-400);">No hay registros para hoy.</div>';
}
renderTodayAttendance();

renderStats('attendStats', [
  { icon:'✅', label:'Presentes', value:'112', color:'green' },
  { icon:'❌', label:'Ausentes', value:'4', color:'red' },
  { icon:'⏰', label:'Tardanzas', value:'4', color:'yellow' },
  { icon:'🏖️', label:'Vacaciones', value:'8', color:'blue' }
]);

// Calendar
const calEl = document.getElementById('attendCalendar');
if (calEl) {
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  let html = days.map(d => `<div class="cal-header">${d}</div>`).join('');
  // April 2025 starts on Tuesday (index 1), so 1 blank
  for (let i = 0; i < 1; i++) html += '<div class="cal-day other-month"></div>';
  for (let d = 1; d <= 30; d++) {
    const today = d === 4;
    const cls = today ? 'today' : d <= 3 ? ['present','present','absent'][d%3] : d > 4 ? '' : 'present';
    html += `<div class="cal-day ${cls}">${d}</div>`;
  }
  calEl.innerHTML = html;
}

// Today attendance list
const todayEl = document.getElementById('todayAttendList');
if (todayEl) {
  todayEl.innerHTML = employees.slice(0,7).map((e,i) => {
    const hr = 7 + Math.floor(Math.random()*2);
    const mn = String(Math.floor(Math.random()*59)).padStart(2,'0');
    const late = hr >= 9;
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100)">
      <div class="emp-avatar" style="background:${e.color};width:32px;height:32px;font-size:11px">${e.name.split(' ').map(w=>w[0]).join('')}</div>
      <div style="flex:1"><div class="text-sm font-semibold">${e.name}</div></div>
      <div style="font-size:12px;color:var(--gray-500)">0${hr}:${mn}</div>
      <span class="badge ${late ? 'badge-warning' : 'badge-success'}">${late ? 'Tardanza' : 'Puntual'}</span>
    </div>`;
  }).join('');
}

// === DOCUMENTS PAGE ===
renderStats('docStats', [
  { icon:'📄', label:'Total Documentos', value:'245', color:'blue' },
  { icon:'✍️', label:'Pendientes Firma', value:'12', color:'yellow' },
  { icon:'✅', label:'Firmados', value:'230', color:'green' },
  { icon:'❌', label:'Rechazados', value:'3', color:'red' }
]);

// === DOCUMENTS PAGE — PERSISTENT ===
const defaultDocs = [
  { id:1, name:'Contrato Laboral — Carmen Rojas', type:'Contrato', emp:'Carmen Rojas', date:'01/04/2025', status:'pending' },
  { id:2, name:'Adenda Salarial — Pedro Ramírez', type:'Adenda', emp:'Pedro Ramírez', date:'28/03/2025', status:'signed' },
  { id:3, name:'Política de Teletrabajo v2', type:'Política', emp:'Todos', date:'25/03/2025', status:'signed' },
  { id:4, name:'NDA — Diego Vargas', type:'Confidencialidad', emp:'Diego Vargas', date:'20/03/2025', status:'pending' },
  { id:5, name:'Carta de Amonestación', type:'Disciplinario', emp:'Sofía Herrera', date:'15/03/2025', status:'rejected' },
  { id:6, name:'Certificado de Trabajo — Miguel Flores', type:'Certificado', emp:'Miguel Flores', date:'10/03/2025', status:'signed' }
];

let docs = JSON.parse(localStorage.getItem('akm_docs')) || defaultDocs;

function saveDocs() { localStorage.setItem('akm_docs', JSON.stringify(docs)); }
function renderDocStats() {
  renderStats('docStats', [
    { icon:'📋', label:'Total', value: docs.length, color:'blue' },
    { icon:'✅', label:'Firmados', value: docs.filter(d => d.status === 'signed').length, color:'green' },
    { icon:'❌', label:'Pendientes', value: docs.filter(d => d.status === 'pending').length, color:'yellow' },
    { icon:'🚫', label:'Rechazados', value: docs.filter(d => d.status === 'rejected').length, color:'red' }
  ]);
}

function renderDocsTable() {
  const docTbody = document.querySelector('#docTable tbody');
  if (!docTbody) return;
  docTbody.innerHTML = docs.map(d => `
    <tr>
      <td class="font-semibold">${d.name}</td>
      <td><span class="badge badge-blue">${d.type}</span></td>
      <td>${d.emp}</td>
      <td class="text-gray">${d.date}</td>
      <td><span class="badge ${docStatusMap[d.status][1]}">${docStatusMap[d.status][0]}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" title="Ver">👁️</button>
        ${d.status === 'pending' ? `<button class="btn btn-outline btn-sm" onclick="openSignModal(${d.id})" style="color:var(--akm-blue-light); border-color:var(--akm-blue-light);">✍️ Firmar</button>` : ''}
      </td>
    </tr>
  `).join('');
  renderDocStats();
}
renderDocsTable();

// === SIGNATURE MODAL FUNCTIONS ===
function openSignModal(id) {
  const doc = docs.find(d => d.id === id);
  if (!doc) return;
  
  document.getElementById('signDocId').value = doc.id;
  document.getElementById('signDocName').textContent = doc.name;
  document.getElementById('signerName').value = currentUser.name;
  document.getElementById('signPass').value = '';
  document.getElementById('signModal').classList.add('show');
}

function closeSignModal() {
  document.getElementById('signModal').classList.remove('show');
}

function confirmSignature(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('signDocId').value);
  const pass = document.getElementById('signPass').value;
  
  // Security validation (demo password)
  if (pass !== 'akm2024') {
    alert('❌ Contraseña incorrecta. La firma ha sido denegada por seguridad.');
    addNotification('danger', `Intento de firma fallido para: <strong>${document.getElementById('signDocName').textContent}</strong> (Clave errónea).`);
    return;
  }
  
  const index = docs.findIndex(d => d.id === id);
  if (index !== -1) {
    docs[index].status = 'signed';
    docs[index].date = new Date().toLocaleDateString();
    saveDocs();
    addNotification('success', `Contrato firmado con éxito: <strong>${docs[index].name}</strong>.`);
    renderDocsTable();
    closeSignModal();
    alert('✅ Firma confirmada. El documento ha sido archivado legalmente.');
  }
}

// === PERFORMANCE PAGE ===
renderStats('perfStats', [
  { icon:'⭐', label:'Promedio General', value:'4.2/5', color:'yellow' },
  { icon:'🏆', label:'Top Performers', value:'15', color:'green' },
  { icon:'📋', label:'Evaluaciones', value:'85%', color:'blue' },
  { icon:'🎯', label:'Objetivos Cumplidos', value:'72%', color:'purple' }
]);

function renderPerformance() {
  window._perfRendered = true;
  const ctx = document.getElementById('chartPerformance');
  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['RRHH', 'Finanzas', 'Tecnología', 'Comercial', 'Desarrollo', 'Bienestar'],
        datasets: [{ label: 'Puntaje Promedio', data: [4.5, 4.1, 4.6, 3.8, 4.3, 4.0],
          backgroundColor: ['#6366f1','#f97316','#14b8a6','#3b82f6','#ec4899','#f59e0b'],
          borderRadius: 8, barThickness: 36 }]
      },
      options: { responsive:true, scales: { y: { beginAtZero:true, max:5, grid:{color:'#f1f5f9'} }, x:{grid:{display:false}} }, plugins: { legend:{display:false} } }
    });
  }
  const topEl = document.getElementById('topPerformers');
  if (topEl) {
    const top = [
      { name:'Pedro Ramírez', score:'4.9', area:'Tecnología', color:'#14b8a6' },
      { name:'María García', score:'4.8', area:'RRHH', color:'#6366f1' },
      { name:'Diego Vargas', score:'4.7', area:'Tecnología', color:'#22c55e' },
      { name:'Ana Torres', score:'4.5', area:'Desarrollo', color:'#ec4899' },
      { name:'Carlos López', score:'4.4', area:'Finanzas', color:'#f97316' }
    ];
    topEl.innerHTML = top.map((t,i) => `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--gray-100)">
        <div style="width:28px;font-size:16px;font-weight:800;color:${i<3?'var(--akm-yellow)':'var(--gray-400)'}">#${i+1}</div>
        <div class="emp-avatar" style="background:${t.color};width:36px;height:36px;font-size:13px">${t.name.split(' ').map(w=>w[0]).join('')}</div>
        <div style="flex:1"><div class="text-sm font-semibold">${t.name}</div><div class="text-xs text-gray">${t.area}</div></div>
        <div style="font-size:18px;font-weight:800;color:var(--akm-blue-light)">${t.score}</div>
      </div>
    `).join('');
  }
}

// === TRAINING PAGE ===
renderStats('trainStats', [
  { icon:'🎓', label:'Cursos Activos', value:'12', color:'blue' },
  { icon:'👤', label:'Participantes', value:'96', color:'green' },
  { icon:'✅', label:'Completados', value:'65%', color:'yellow' },
  { icon:'📜', label:'Certificados', value:'48', color:'purple' }
]);

const courses = [
  { title:'Liderazgo Efectivo', cat:'Habilidades Blandas', hours:'8h', progress:85, emoji:'🎯', bg:'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { title:'Excel Avanzado', cat:'Técnico', hours:'12h', progress:62, emoji:'📊', bg:'linear-gradient(135deg,#22c55e,#14b8a6)' },
  { title:'Power BI', cat:'Analítica', hours:'16h', progress:40, emoji:'📈', bg:'linear-gradient(135deg,#3b82f6,#0ea5e9)' },
  { title:'Seguridad de la Información', cat:'Compliance', hours:'4h', progress:100, emoji:'🔒', bg:'linear-gradient(135deg,#ef4444,#f97316)' },
  { title:'Comunicación Asertiva', cat:'Habilidades Blandas', hours:'6h', progress:55, emoji:'💬', bg:'linear-gradient(135deg,#ec4899,#f43f5e)' },
  { title:'Gestión del Tiempo', cat:'Productividad', hours:'5h', progress:30, emoji:'⏰', bg:'linear-gradient(135deg,#f59e0b,#eab308)' }
];
const courseGrid = document.getElementById('courseGrid');
if (courseGrid) {
  courseGrid.innerHTML = courses.map(c => `
    <div class="course-card">
      <div class="course-thumb" style="background:${c.bg}">${c.emoji}</div>
      <div class="course-body">
        <div class="course-title">${c.title}</div>
        <div class="course-meta">${c.cat} · ${c.hours}</div>
        <div class="progress-bar mb-8"><div class="progress-fill" style="width:${c.progress}%"></div></div>
        <div class="flex justify-between text-xs"><span class="text-gray">Progreso</span><span class="font-bold" style="color:var(--akm-blue-light)">${c.progress}%</span></div>
      </div>
    </div>
  `).join('');
}

// === RECRUITMENT PAGE (ATS) ===
function renderRecruitment() {
  window._recRendered = true;
  renderStats('recStats', [
    { icon:'📋', label:'Vacantes Activas', value:'5', color:'blue' },
    { icon:'👥', label:'Candidatos', value:'42', color:'green' },
    { icon:'📅', label:'Entrevistas', value:'8', color:'yellow' },
    { icon:'✅', label:'Contratados YTD', value:'14', color:'purple' }
  ]);

  const vacancies = [
    { role:'Desarrollador Senior', area:'Tecnología', apps:12, status:'Urgente' },
    { role:'Analista de Nómina', area:'Finanzas', apps:8, status:'Activo' },
    { role:'Reclutador IT', area:'RRHH', apps:15, status:'Activo' },
    { role:'Gerente de Ventas', area:'Comercial', apps:4, status:'Activo' },
    { role:'Diseñador UX', area:'Tecnología', apps:3, status:'Nuevo' }
  ];

  const vacEl = document.getElementById('vacancyList');
  if (vacEl) {
    vacEl.innerHTML = vacancies.map(v => `
      <div style="display:flex;align-items:center;gap:15px;padding:12px 0;border-bottom:1px solid var(--gray-100)">
        <div style="width:40px;height:40px;border-radius:10px;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:20px">💼</div>
        <div style="flex:1"><div class="text-sm font-semibold">${v.role}</div><div class="text-xs text-gray">${v.area}</div></div>
        <div class="text-center" style="width:80px"><div class="font-bold">${v.apps}</div><div class="text-xs text-gray">Postulantes</div></div>
        <span class="badge ${v.status==='Urgente'?'badge-danger':'badge-blue'}">${v.status}</span>
      </div>
    `).join('');
  }

  const candidates = [
    { name:'Juan Pérez', role:'Dev Senior', stage:'Entrevista Técnica', score:4.8 },
    { name:'Laura Cruz', role:'Reclutador IT', stage:'Finalista', score:4.5 },
    { name:'Andrés Mora', role:'Analista Nómina', stage:'Psicotécnico', score:3.9 },
    { name:'Rosa Lina', role:'UX Designer', stage:'Nuevo', score:4.2 },
    { name:'Pablo Soto', role:'Dev Senior', stage:'Primer Filtro', score:4.0 }
  ];

  const candEl = document.getElementById('candidateList');
  if (candEl) {
    candEl.innerHTML = candidates.map(c => `
      <div style="display:flex;align-items:center;gap:15px;padding:12px 0;border-bottom:1px solid var(--gray-100)">
        <div class="emp-avatar" style="background:#475569;width:32px;height:32px;font-size:11px">${c.name.split(' ').map(w=>w[0]).join('')}</div>
        <div style="flex:1"><div class="text-sm font-semibold">${c.name}</div><div class="text-xs text-gray">${c.role}</div></div>
        <span class="badge badge-gray">${c.stage}</span>
        <div class="font-bold" style="color:var(--akm-blue-light)">${c.score}</div>
      </div>
    `).join('');
  }
}

// === ANALYTICS PAGE ===
function renderAnalytics() {
  window._analyticsRendered = true;
  renderStats('analyticsStats', [
    { icon:'📊', label:'Headcount', value:'128', color:'blue', change:'+12 YTD', changeDir:'up' },
    { icon:'🔄', label:'Rotación Anual', value:'8.5%', color:'yellow', change:'-1.2%', changeDir:'up' },
    { icon:'⏱️', label:'Tenure Promedio', value:'2.8 años', color:'green' },
    { icon:'😊', label:'Satisfacción', value:'4.3/5', color:'purple', change:'+0.2', changeDir:'up' }
  ]);

  // Headcount
  new Chart(document.getElementById('chartHeadcount'), {
    type:'line',
    data: { labels:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
      datasets:[{ label:'Headcount', data:[116,118,120,122,123,124,125,126,126,127,126,128],
        borderColor:'#2356a8', backgroundColor:'rgba(35,86,168,0.08)', fill:true, tension:0.4, pointRadius:4,
        pointBackgroundColor:'#2356a8', borderWidth:2.5 }]
    },
    options:{ responsive:true, scales:{ y:{beginAtZero:false,grid:{color:'#f1f5f9'}}, x:{grid:{display:false}} },
      plugins:{ legend:{display:false} } }
  });

  // Turnover
  new Chart(document.getElementById('chartTurnover'), {
    type:'bar',
    data: { labels:['RRHH','Finanzas','Tech','Comercial','Desarrollo','Bienestar'],
      datasets:[{ label:'Rotación %', data:[5,8,12,15,6,4],
        backgroundColor:['#6366f1','#f97316','#14b8a6','#3b82f6','#ec4899','#f59e0b'], borderRadius:8, barThickness:32 }]
    },
    options:{ responsive:true, scales:{ y:{beginAtZero:true,grid:{color:'#f1f5f9'}}, x:{grid:{display:false}} },
      plugins:{ legend:{display:false} } }
  });

  // Gender
  new Chart(document.getElementById('chartGender'), {
    type:'doughnut',
    data: { labels:['Masculino','Femenino','No binario'],
      datasets:[{ data:[62,60,6], backgroundColor:['#3b82f6','#ec4899','#a855f7'], borderWidth:0, borderRadius:4 }]
    },
    options:{ responsive:true, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{padding:16,usePointStyle:true,font:{family:'Inter',size:12}} } } }
  });

  // Satisfaction
  new Chart(document.getElementById('chartSatisfaction'), {
    type:'line',
    data: { labels:['Q1 2024','Q2 2024','Q3 2024','Q4 2024','Q1 2025'],
      datasets:[
        { label:'Satisfacción', data:[3.8,4.0,4.1,4.2,4.3], borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,0.08)', fill:true, tension:0.4, pointRadius:5, pointBackgroundColor:'#22c55e', borderWidth:2.5 },
        { label:'Engagement', data:[3.5,3.7,3.9,4.0,4.1], borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.08)', fill:true, tension:0.4, pointRadius:5, pointBackgroundColor:'#f59e0b', borderWidth:2.5 }
      ]
    },
    options:{ responsive:true, scales:{ y:{min:3,max:5,grid:{color:'#f1f5f9'}}, x:{grid:{display:false}} },
      plugins:{ legend:{ position:'bottom', labels:{padding:16,usePointStyle:true,font:{family:'Inter',size:12}} } } }
  });
}

// === AKM AI CHAT ===
const aiResponses = {
  'empleados activos': '📊 Actualmente hay **118 colaboradores activos** de un total de 128 registrados.\n\n• 8 en vacaciones\n• 2 inactivos\n\nEl área con más personal es **Tecnología** con 32 colaboradores.',
  'planilla': '💰 **Resumen Planilla — Marzo 2025:**\n\n• Total Bruto: S/ 69,100\n• Descuentos: S/ 8,983\n• Neto Pagado: S/ 60,117\n• Boletas emitidas: 10/10\n\nTodas las boletas fueron procesadas a tiempo.',
  'cumpleaños': '🎂 **Próximos cumpleaños:**\n\n• 8 Abr — Carmen Rojas (Reclutadora)\n• 15 Abr — Pedro Ramírez (Jefe de TI)\n• 22 Abr — Diego Vargas (Ing. de Datos)\n\n¿Deseas programar una celebración?',
  'rotación': '📈 **Indicadores de Rotación — Q1 2025:**\n\n• Tasa de rotación: 8.5% anual\n• Área con mayor rotación: Comercial (15%)\n• Área más estable: Bienestar (4%)\n• Promedio de permanencia: 2.8 años\n\nLa rotación ha mejorado 1.2% vs Q4 2024.',
  'vacantes': '💼 **Estado de Reclutamiento:**\n\n• Vacantes activas: 5\n• Candidatos en pipeline: 42\n• Entrevistas esta semana: 8\n\nLa vacante más urgente es: **Desarrollador Senior** (12 postulantes).'
};

// === MODAL CRUD FUNCTIONS ===
function generateDynamicPassword(fullName) {
  // Normalize: remove accents and non-alpha
  const normalized = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const parts = normalized.split(' ').filter(p => p.length > 0);
  const namePart = parts[0] ? parts[0].substring(0, 3) : "akm";
  const surnamePart = parts[1] ? parts[1].substring(0, 3) : "akm";
  return `akm${namePart}${surnamePart}`;
}

function openEmpModal(id = null) {
  const modal = document.getElementById('empModal');
  const form = document.getElementById('empForm');
  const title = document.getElementById('modalTitle');
  
  form.reset();
  document.getElementById('empId').value = '';
  title.textContent = 'Nuevo Colaborador';
  
  if (id) {
    const emp = employees.find(e => e.id === id);
    if (emp) {
      document.getElementById('empId').value = emp.id;
      document.getElementById('empName').value = emp.name;
      document.getElementById('empEmail').value = emp.email || '';
      document.getElementById('empCargo').value = emp.cargo;
      document.getElementById('empArea').value = emp.area;
      document.getElementById('empStatus').value = emp.status;
      document.getElementById('empSalary').value = emp.salary;
      document.getElementById('empDate').value = emp.date;
      document.getElementById('empSupervisor').value = emp.supervisor || '';
      title.textContent = 'Editar Colaborador';
    }
  }
  
  modal.classList.add('show');
}

function saveEmployee(e) {
  e.preventDefault();
  const idInput = document.getElementById('empId').value;
  const name = document.getElementById('empName').value;
  const email = document.getElementById('empEmail').value;
  const cargo = document.getElementById('empCargo').value;
  const area = document.getElementById('empArea').value;
  const status = document.getElementById('empStatus').value;
  const salary = parseInt(document.getElementById('empSalary').value);
  const date = document.getElementById('empDate').value;
  const supervisor = document.getElementById('empSupervisor').value;
  
  const colors = ['#6366f1', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6', '#3b82f6'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  if (idInput) {
    // Edit
    const index = employees.findIndex(emp => emp.id === parseInt(idInput));
    if (index !== -1) {
      const oldStatus = employees[index].status;
      employees[index] = { ...employees[index], name, email, cargo, area, status, salary, date, supervisor };
      
      // Automatic Lifecycle: Cese Document
      if (oldStatus !== 'inactive' && status === 'inactive') {
        generateTerminationDocuments(employees[index]);
      }
    }
  } else {
    // Create
    const newId = employees.length > 0 ? Math.max(...employees.map(emp => emp.id)) + 1 : 1;
    const password = generateDynamicPassword(name);
    employees.push({ 
      id: newId, name, email, password, role:'colab', cargo, area, status, salary, date, supervisor,
      color: randomColor, contractEnd:'2025-12-31' 
    });
    alert(`Colaborador creado.\nCredenciales:\nID: ${email}\nClave: ${password}`);
  }
  
  updateAllDashboardData();
  closeEmpModal();
}

function generateTerminationDocuments(emp) {
  const doc = {
    id: Date.now(),
    name: `Liquidación y Carta de Cese — ${emp.name}`,
    type: 'Cese',
    emp: emp.name,
    date: new Date().toLocaleDateString(),
    status: 'pending'
  };
  docs.unshift(doc);
  saveDocs();
  addNotification('danger', `📄 Se ha generado el **Documento de Cese** para ${emp.name}.`);
}

function deleteEmployee(id) {
  if (confirm('¿Estás seguro de eliminar a este colaborador?')) {
    employees = employees.filter(e => e.id !== id);
    updateAllDashboardData();
  }
}

// Update AI response helper to use real data
function getAIResponse(msg) {
  const lower = msg.toLowerCase();
  
  if (lower.includes('empleados activos')) {
    const active = employees.filter(e => e.status === 'active').length;
    return `📊 Actualmente hay **${active} colaboradores activos** de un total de ${employees.length} registrados.\n\n• ${employees.filter(e=>e.status==='vacation').length} en vacaciones\n• ${employees.filter(e=>e.status==='inactive').length} inactivos\n\n¿Deseas ver el detalle del equipo?`;
  }
  
  for (const [key, val] of Object.entries(aiResponses)) { 
    if (lower.includes(key)) return val; 
  }
  
  return '¡Gracias por tu consulta! He analizado los datos disponibles de tus colaboradores.\n\nActualmente puedo ayudarte con información sobre:\n• 👥 Colaboradores activos\n• 💰 Planillas y nóminas\n• 🎂 Cumpleaños del equipo\n• 📈 Indicadores de rotación\n\n¿Sobre cuál tema te gustaría más detalle?';
}

function addChatMsg(text, isUser) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg' + (isUser ? ' user' : '');
  const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>').replace(/• /g, '&bull; ');
  div.innerHTML = `
    <div class="chat-avatar ${isUser ? 'user-avatar-chat' : 'bot-avatar'}">${isUser ? '👤' : '🤖'}</div>
    <div class="chat-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}">${formatted}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg'; div.id = 'typingMsg';
  div.innerHTML = `<div class="chat-avatar bot-avatar">🤖</div><div class="chat-bubble bot-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  addChatMsg(msg, true);
  input.value = '';
  showTyping();
  setTimeout(() => {
    const typing = document.getElementById('typingMsg');
    if (typing) typing.remove();
    addChatMsg(getAIResponse(msg), false);
  }, 1200 + Math.random() * 800);
}

function sendQuickChat(el) { 
  document.getElementById('chatInput').value = el.textContent.replace(/^[^\s]+\s/, '');
  sendChat();
}

// Initial render
switchPage('home');

// === SURPRISE: ORGANIGRAM ENGINE ===
function renderOrgChart() {
  window._orgRendered = true;
  const container = document.getElementById('orgChartContainer');
  if (!container) return;

  // Build tree structure
  const buildTree = (supervisorId) => {
    const children = employees.filter(e => e.supervisor === supervisorId);
    if (children.length === 0) return '';

    let html = '<ul>';
    children.forEach(emp => {
      const initials = emp.name.split(' ').map(n => n[0]).join('');
      html += `
        <li>
          <div class="org-node" onclick="openEmpModal(${emp.id})">
            <div class="org-avatar" style="background:${emp.color}">${initials}</div>
            <div class="font-bold">${emp.name}</div>
            <div class="node-meta">${emp.cargo}</div>
          </div>
          ${buildTree(emp.id)}
        </li>
      `;
    });
    html += '</ul>';
    return html;
  };

  const roots = employees.filter(e => e.supervisor === null);
  let finalHtml = '<div class="org-tree"><ul>';
  roots.forEach(root => {
    const initials = root.name.split(' ').map(n => n[0]).join('');
    finalHtml += `
      <li>
        <div class="org-node" style="border-top: 4px solid var(--akm-blue-deep)" onclick="openEmpModal(${root.id})">
          <div class="org-avatar" style="background:${root.color}">${initials}</div>
          <div class="font-bold">${root.name}</div>
          <div class="node-meta">${root.cargo}</div>
        </div>
        ${buildTree(root.id)}
      </li>
    `;
  });
  finalHtml += '</ul></div>';
  container.innerHTML = finalHtml;
}

// === SURPRISE: RISK AI DASHBOARD ===
function renderRiskAI() {
  window._chartRiskRendered = true;
  const ctx = document.getElementById('chartRisk');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Puntualidad', 'Carga Laboral', 'Antigüedad', 'Feedback', 'Capacitación', 'Salario vs Mercado'],
      datasets: [
        {
          label: 'Promedio Empresa',
          data: [85, 70, 60, 80, 75, 65],
          backgroundColor: 'rgba(35, 86, 168, 0.1)',
          borderColor: '#2356a8',
          borderWidth: 1
        },
        {
          label: 'Segmento RRHH (Riesgo)',
          data: [90, 85, 40, 70, 90, 50],
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          borderColor: '#38bdf8',
          borderWidth: 2,
          pointBackgroundColor: '#38bdf8'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          angleLines: { color: '#f1f5f9' },
          grid: { color: '#f1f5f9' },
          pointLabels: { font: { family: 'Inter', size: 10 } },
          ticks: { display: false },
          suggestedMin: 0, suggestedMax: 100
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } }
      }
    }
  });
}

// === RENEWAL CONSOLE LOGIC ===
function openRenewalModal(empId) {
  const emp = employees.find(e => e.id === empId);
  if (!emp) return;

  document.getElementById('renewalEmpId').value = emp.id;
  document.getElementById('renewalTitle').textContent = `Renovación: ${emp.name}`;
  document.getElementById('renewalCargo').value = emp.cargo;
  
  // Suggest 6 months by default from today or from old end date
  const baseDate = new Date(emp.contractEnd);
  const future = new Date(baseDate.setMonth(baseDate.getMonth() + 6));
  document.getElementById('renewalEndDate').value = future.toISOString().split('T')[0];
  document.getElementById('renewalMonths').value = "6";

  document.getElementById('renewalModal').classList.add('show');
}

function closeRenewalModal() {
  document.getElementById('renewalModal').classList.remove('show');
}

function updateRenewalDate(months) {
  if (months === "0") return;
  const empId = parseInt(document.getElementById('renewalEmpId').value);
  const emp = employees.find(e => e.id === empId);
  if (!emp) return;

  const baseDate = new Date(emp.contractEnd);
  const future = new Date(baseDate.setMonth(baseDate.getMonth() + parseInt(months)));
  document.getElementById('renewalEndDate').value = future.toISOString().split('T')[0];
}

function confirmRenewal(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('renewalEmpId').value);
  const newDate = document.getElementById('renewalEndDate').value;
  const newCargo = document.getElementById('renewalCargo').value;

  const empIndex = employees.findIndex(emp => emp.id === id);
  if (empIndex !== -1) {
    const emp = employees[empIndex];
    // Update data
    employees[empIndex].contractEnd = newDate;
    employees[empIndex].cargo = newCargo;
    saveToStorage();

    // Generate Document for Signature
    const newDoc = {
      id: Date.now(),
      name: `Adenda de Renovación y Ascenso — ${emp.name}`,
      type: 'Contrato',
      emp: emp.name,
      date: new Date().toLocaleDateString(),
      status: 'pending'
    };
    docs.unshift(newDoc);
    saveDocs();

    addNotification('success', `✅ Renovación aprobada para **${emp.name}**. Documento enviado para firma.`);
    
    // Refresh UI
    if (window._orgRendered) renderOrgChart();
    renderEmployees();
    renderDocsTable();
    closeRenewalModal();
    
    alert(`Éxito: Se ha renovado a ${emp.name} hasta el ${newDate}. Se le ha notificado el cambio de puesto a ${newCargo}.`);
  }
}

// === COLABORADOR PORTAL LOGIC ===
function renderColaboradorHome() {
  const homeStatsEl = document.getElementById('homeStats');
  if (!homeStatsEl) return;

  const myDocs = docs.filter(d => d.emp === currentUser.name && d.status === 'pending');
  const myEmpData = employees.find(e => e.email === currentUser.email);

  // Simplified Header for Colab
  document.getElementById('homeStats').innerHTML = `
    <div class="card p-24" style="grid-column: span 2; background: linear-gradient(135deg, var(--akm-blue-deep) 0%, #1c4b82 100%); color:white;">
      <div class="flex items-center justify-between">
        <div>
          <h3 style="font-size:24px; font-weight:800; margin-bottom:8px;">¡Hola, ${currentUser.name.split(' ')[0]}! 👋</h3>
          <p style="opacity:0.8; font-size:15px;">Bienvenido a tu portal personal. Tienes <strong>${myDocs.length} documentos</strong> pendientes.</p>
        </div>
        <button class="btn btn-primary" onclick="switchPage('attendance')" style="background:var(--akm-cyan); border-color:var(--akm-cyan); color:var(--akm-blue-deep)">🕒 Marcar Asistencia</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Mi Contrato</div></div>
      <div class="card-body">
        <div class="text-xs text-gray uppercase mb-4">Vencimiento</div>
        <div style="font-size:18px; font-weight:700; color:var(--akm-blue-deep)">${myEmpData ? myEmpData.contractEnd : '---'}</div>
        <div class="badge badge-success mt-8">Vigente</div>
      </div>
    </div>
    <div class="card" onclick="switchPage('training')" style="cursor:pointer">
      <div class="card-header"><div class="card-title">Aprendizaje</div></div>
      <div class="card-body">
        <div style="font-size:32px; margin-bottom:8px;">🎓</div>
        <div class="text-sm font-semibold">Cursos Recomendados</div>
      </div>
    </div>
  `;

  // Hide activity chart for colab
  const activitySection = document.getElementById('chartAttendToday').closest('.card');
  if (activitySection) activitySection.style.display = 'none';

  // Specific Greeting
  document.getElementById('greetingText').textContent = "Mi Portal AKM";
}

function requestVacations() {
  const days = prompt("¿Cuántos días de vacaciones deseas solicitar?");
  if (!days || isNaN(days)) return;

  const doc = {
    id: Date.now(),
    name: `Solicitud de Vacaciones — ${currentUser.name} (${days} días)`,
    type: 'Vacaciones',
    emp: currentUser.name,
    date: new Date().toLocaleDateString(),
    status: 'pending'
  };
  docs.unshift(doc);
  saveDocs();
  renderDocsTable();
  addNotification('info', `✅ Solicitud de vacaciones enviada a RRHH y a tu jefe directo.`);
  alert("Solicitud registrada. Requiere firma de tu Jefe de Área y posterior aprobación de RRHH.");
}

// Override switchPage to handle access
const originalSwitchPage = switchPage;
switchPage = function(id) {
  const isColab = currentUser.role === 'colab';
  const forbidden = ['payroll', 'analytics', 'recruitment', 'performance'];
  if (isColab && forbidden.includes(id)) {
    addNotification('danger', '⚠️ No tienes permisos para acceder a esta sección.');
    return;
  }
  originalSwitchPage(id);
};
