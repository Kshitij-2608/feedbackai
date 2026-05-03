/* ── State ────────────────────────────────────────────────────────────────── */
let currentUser = null;        // { user_id, name, email, token }
let currentSessionId = null;   // active interview session UUID
let pendingImageB64 = null;    // base64 of image from Upload section
let pendingImageName = null;   // filename
let pendingContentType = 'image'; // selected file type category
let sessionEnded = false;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function genSessionId() {
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function authHeader() {
  return currentUser ? { 'Authorization': `Bearer ${currentUser.token}` } : {};
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers||{}) },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

/* ── Auth ─────────────────────────────────────────────────────────────────── */
function switchTab(tab) {
  document.getElementById('signin-form').classList.toggle('hidden', tab !== 'signin');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('signin-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
}

function setAuthLoading(formId, loading) {
  const btn = document.getElementById(formId === 'signin-form' ? 'signin-btn' : 'signup-btn');
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-spinner').classList.toggle('hidden', !loading);
  btn.disabled = loading;
}

function showAuthError(formId, msg) {
  const el = document.getElementById(formId === 'signin-form' ? 'signin-error' : 'signup-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  if (!email || !password) return showAuthError('signin-form', 'Please fill in all fields.');
  setAuthLoading('signin-form', true);
  try {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    saveUser(data);
    enterApp();
  } catch (err) {
    showAuthError('signin-form', err.message);
  } finally {
    setAuthLoading('signin-form', false);
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) return showAuthError('signup-form', 'Please fill in all fields.');
  if (password.length < 6) return showAuthError('signup-form', 'Password must be at least 6 characters.');
  setAuthLoading('signup-form', true);
  try {
    const data = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    saveUser(data);
    enterApp();
  } catch (err) {
    showAuthError('signup-form', err.message);
  } finally {
    setAuthLoading('signup-form', false);
  }
}

function saveUser(data) {
  currentUser = { user_id: data.user_id, name: data.name, email: data.email, token: data.token, is_admin: data.is_admin || false };
  localStorage.setItem('hs_user', JSON.stringify(currentUser));
}

function loadUser() {
  try {
    const saved = localStorage.getItem('hs_user');
    if (saved) currentUser = JSON.parse(saved);
  } catch { currentUser = null; }
}

function handleSignOut() {
  currentUser = null;
  currentSessionId = null;
  pendingImageB64 = null;
  sessionEnded = false;
  localStorage.removeItem('hs_user');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('signin-form').reset();
  document.getElementById('signup-form').reset();
  switchTab('signin');
}

function toggleEditAccount() {
  const viewMode = document.getElementById('account-view-mode');
  const editMode = document.getElementById('account-edit-mode');
  const isEditing = !editMode.classList.contains('hidden');
  
  if (!isEditing) {
    // Populate form with current data
    document.getElementById('edit-name').value = currentUser.name;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-error').classList.add('hidden');
  }
  
  viewMode.classList.toggle('hidden');
  editMode.classList.toggle('hidden');
}

async function handleUpdateAccount(e) {
  e.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const password = document.getElementById('edit-password').value;
  const errorEl = document.getElementById('edit-error');
  const btn = document.getElementById('edit-save-btn');
  
  errorEl.classList.add('hidden');
  
  if (!name || !email) {
    errorEl.textContent = 'Name and email are required.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  const body = { name, email };
  if (password) {
    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      errorEl.classList.remove('hidden');
      return;
    }
    body.password = password;
  }
  
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  try {
    const data = await apiFetch('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) });
    saveUser(data);
    
    // Update UI elements across the app
    document.getElementById('user-name-nav').textContent = data.name;
    const initial = data.name.charAt(0).toUpperCase();
    document.getElementById('user-avatar-nav').textContent = initial;
    document.getElementById('account-avatar').textContent = initial;
    document.getElementById('account-name').textContent = data.name;
    document.getElementById('account-email').textContent = data.email;
    
    toggleEditAccount();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}


/* ── App Entry ────────────────────────────────────────────────────────────── */
function enterApp() {
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // Populate user UI
  const initial = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('user-avatar-nav').textContent = initial;
  document.getElementById('user-name-nav').textContent = currentUser.name;
  document.getElementById('account-avatar').textContent = initial;
  document.getElementById('account-name').textContent = currentUser.name;
  document.getElementById('account-email').textContent = currentUser.email;
  // Show/hide admin tab based on role
  const adminNav = document.getElementById('nav-admin');
  if (adminNav) {
    adminNav.style.display = currentUser.is_admin ? '' : 'none';
  }
  // Start on interview section
  showSection('interview');
  initInterview();
}

/* ── Navigation ───────────────────────────────────────────────────────────── */
const SECTIONS = ['dashboard', 'upload', 'interview', 'summary', 'account', 'admin'];

function showSection(name) {
  // Prevent non-admins from accessing admin section
  if (name === 'admin' && (!currentUser || !currentUser.is_admin)) {
    return;
  }
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`).classList.toggle('hidden', s !== name);
    const link = document.getElementById(`nav-${s}`);
    if (link) link.classList.toggle('active', s === name);
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'summary') loadSummary();
  if (name === 'admin') loadAdmin();
}

/* ── Upload Section ───────────────────────────────────────────────────────── */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FILE_TYPE_CONFIG = {
  image:    { accept: 'image/*', hint: 'PNG, JPG, WEBP up to 10 MB', icon: 'image' },
  document: { accept: '.pdf,.doc,.docx,.txt,.csv,.xlsx', hint: 'PDF, DOC, TXT, CSV up to 10 MB', icon: 'description' },
  audio:    { accept: 'audio/*', hint: 'MP3, WAV, FLAC, AAC up to 10 MB', icon: 'headphones' },
  video:    { accept: 'video/*', hint: 'MP4, WebM, MOV up to 10 MB', icon: 'videocam' },
  text:     { accept: '.txt,.json,.md,.log,.csv', hint: 'TXT, JSON, MD, LOG, CSV up to 10 MB', icon: 'article' },
};

function selectFileType(type) {
  pendingContentType = type;
  // Update chips
  document.querySelectorAll('.file-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.type === type);
  });
  // Update file input accept
  const config = FILE_TYPE_CONFIG[type];
  document.getElementById('upload-file-input').accept = config.accept;
  document.getElementById('upload-accept-hint').textContent = config.hint;
  // Clear any existing preview
  removeUploadedImage();
}

const dropZone = () => document.getElementById('upload-drop-zone');

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  setUploadFile(file);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function setUploadFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    alert(`File too large (${formatFileSize(file.size)}). Maximum allowed size is 10 MB.`);
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImageB64 = ev.target.result;
    pendingImageName = file.name;
    
    // Show preview
    const isImage = file.type.startsWith('image/');
    const previewImg = document.getElementById('upload-preview-img');
    const previewIcon = document.getElementById('upload-preview-icon');
    
    if (isImage) {
      previewImg.src = pendingImageB64;
      previewImg.classList.remove('hidden');
      previewIcon.classList.add('hidden');
    } else {
      previewImg.classList.add('hidden');
      previewIcon.classList.remove('hidden');
      // Set icon based on type
      const iconMap = { document: 'description', audio: 'headphones', video: 'videocam', text: 'article' };
      previewIcon.querySelector('.material-icons-outlined').textContent = iconMap[pendingContentType] || 'insert_drive_file';
    }
    
    document.getElementById('upload-preview-name').textContent = file.name;
    document.getElementById('upload-preview-size').textContent = formatFileSize(file.size);
    document.getElementById('upload-preview-type-badge').textContent = pendingContentType.toUpperCase();
    document.getElementById('upload-preview').classList.remove('hidden');
    document.getElementById('start-interview-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function removeUploadedImage() {
  pendingImageB64 = null; pendingImageName = null;
  document.getElementById('upload-preview').classList.add('hidden');
  document.getElementById('upload-preview-img').src = '';
  document.getElementById('upload-file-input').value = '';
  document.getElementById('start-interview-btn').disabled = true;
}

function startInterviewWithImage() {
  if (!pendingImageB64) return;
  // Show attached image bar in interview
  document.getElementById('attached-thumb').src = pendingImageB64;
  document.getElementById('attached-name').textContent = pendingImageName || 'file';
  document.getElementById('image-attached-bar').classList.remove('hidden');
  // Start fresh session
  startNewSession(true);
  showSection('interview');
}

// Drag & drop
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('upload-drop-zone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  });
  dz.addEventListener('click', () => document.getElementById('upload-file-input').click());
});

/* ── Interview Section ────────────────────────────────────────────────────── */
function initInterview() {
  currentSessionId = genSessionId();
  sessionEnded = false;
  document.getElementById('chat-container').innerHTML = '';
  document.getElementById('interview-session-label').textContent = currentSessionId.slice(0, 16) + '…';
  setStatusDot('active', 'Active');
  fetchInitMessage();
}

function startNewSession(withImage = false) {
  currentSessionId = genSessionId();
  sessionEnded = false;
  document.getElementById('chat-container').innerHTML = '';
  document.getElementById('interview-session-label').textContent = currentSessionId.slice(0, 16) + '…';
  setStatusDot('active', 'Active');
  if (!withImage) {
    document.getElementById('image-attached-bar').classList.add('hidden');
    pendingImageB64 = null; pendingImageName = null;
  }
  fetchInitMessage();
}

function setStatusDot(state, label) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  dot.className = 'status-dot ' + (state === 'active' ? '' : state);
  text.textContent = label;
}

async function fetchInitMessage() {
  showTyping(true);
  try {
    const url = `/api/chat/init?session_id=${encodeURIComponent(currentSessionId)}&user_id=${currentUser.user_id}&content_type=${pendingContentType}`;
    const data = await apiFetch(url);
    addMessage('ai', data.message);
  } catch (e) {
    addMessage('ai', 'Hi! I\'m your feedback assistant. Would you like to continue?');
  } finally {
    showTyping(false);
  }
}

async function handleChatSubmit(e) {
  e.preventDefault();
  if (sessionEnded) return;
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  document.getElementById('send-btn').disabled = true;
  showTyping(true);

  // Use image if attached (first message only)
  const imageToSend = pendingImageB64 || null;

  try {
    const body = {
      session_id: currentSessionId,
      message: text,
      user_id: currentUser.user_id,
      image_base64: imageToSend,
      content_type: pendingContentType,
    };
    const data = await apiFetch('/api/chat', { method: 'POST', body: JSON.stringify(body) });

    // Clear image after first use
    if (imageToSend) {
      pendingImageB64 = null;
      clearAttachedImage();
    }

    addMessage('ai', data.message);

    // Detect session end
    const lower = data.message.toLowerCase();
    if (lower.includes('thank you for your feedback') || lower.includes('your responses have been recorded') || lower.includes('have a great day')) {
      sessionEnded = true;
      setStatusDot('ended', 'Session Ended');
      input.disabled = true;
      document.getElementById('send-btn').disabled = true;
      // Auto-navigate to summary after a short delay
      setTimeout(() => showSection('summary'), 2000);
    }
  } catch (err) {
    addMessage('ai', 'Something went wrong. Please try again.');
  } finally {
    showTyping(false);
    if (!sessionEnded) document.getElementById('send-btn').disabled = false;
  }
}

function addMessage(role, text) {
  const container = document.getElementById('chat-container');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const initial = role === 'ai' ? 'AI' : (currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U');
  div.innerHTML = `
    <div class="msg-avatar">${initial}</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function showTyping(show) {
  document.getElementById('typing-indicator').classList.toggle('hidden', !show);
  const c = document.getElementById('chat-container');
  if (show) c.scrollTop = c.scrollHeight;
}

async function forceEndSession() {
  if (!currentSessionId || sessionEnded) return;
  const btn = document.getElementById('end-session-btn');
  btn.disabled = true;
  try {
    await apiFetch(`/api/chat/end?session_id=${encodeURIComponent(currentSessionId)}`, { method: 'POST' });
    sessionEnded = true;
    setStatusDot('ended', 'Session Ended');
    document.getElementById('user-input').disabled = true;
    document.getElementById('send-btn').disabled = true;
    addMessage('ai', 'Session ended. Generating your summary…');
    setTimeout(() => showSection('summary'), 1500);
  } catch (err) {
    addMessage('ai', 'Failed to end session: ' + err.message);
    btn.disabled = false;
  }
}

function clearAttachedImage() {
  document.getElementById('image-attached-bar').classList.add('hidden');
  pendingImageB64 = null; pendingImageName = null;
}

/* ── Summary Section ──────────────────────────────────────────────────────── */
let summaryPollingId = null;

async function loadSummary() {
  if (!currentSessionId) {
    document.getElementById('summary-content').innerHTML =
      '<div class="empty-state"><p>No active session. Start an interview first.</p></div>';
    return;
  }
  document.getElementById('summary-content').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Generating your summary…</p></div>';

  if (summaryPollingId) clearInterval(summaryPollingId);
  summaryPollingId = setInterval(() => pollSummary(), 3000);
  pollSummary();
}

async function pollSummary() {
  try {
    const data = await apiFetch(`/api/summary/${encodeURIComponent(currentSessionId)}`);
    if (data.summary) {
      clearInterval(summaryPollingId);
      renderSummary(data.summary);
    }
  } catch {}
}

function renderSummary(s) {
  const rating = s.rating || 0;
  const stars = Array.from({length:5}, (_,i) =>
    `<span class="star ${i < rating ? 'filled' : ''}">★</span>`).join('');

  const sentimentClass = s.sentiment && s.sentiment.toLowerCase().includes('positive') ? 'positive'
    : s.sentiment && s.sentiment.toLowerCase().includes('negative') ? 'negative' : 'neutral';

  const issues = (s.key_issues || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
  const highlights = (s.conversation_highlights || []).map(h =>
    `<div class="highlight-item">
      <span class="highlight-role ${h.role.toLowerCase()}">${escapeHtml(h.role)}</span>
      <span class="highlight-msg">${escapeHtml(h.message)}</span>
    </div>`).join('');

  document.getElementById('summary-content').innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 1.5a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 4.5zM8 10a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>
          User Interest
        </div>
        <div class="summary-card-value">${escapeHtml(s.user_interest || 'N/A')}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Rating</div>
        <div class="rating-stars">${stars}</div>
        <div class="summary-card-value" style="margin-top:6px">${rating}/5</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Sentiment</div>
        <div class="summary-card-value">
          <span class="sentiment-badge ${sentimentClass}">${escapeHtml(s.sentiment || 'Neutral')}</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Suggestions</div>
        <div class="summary-card-value">${escapeHtml(s.suggestions || 'N/A')}</div>
      </div>
    </div>
    <div class="summary-card" style="margin-bottom:16px">
      <div class="summary-card-label">Interaction Summary</div>
      <div class="summary-card-value">${escapeHtml(s.interaction_summary || 'N/A')}</div>
    </div>
    ${issues ? `<div class="summary-card" style="margin-bottom:16px">
      <div class="summary-card-label">Key Issues</div>
      <ul class="issues-list">${issues}</ul>
    </div>` : ''}
    ${highlights ? `<div class="summary-card" style="margin-bottom:16px">
      <div class="summary-card-label">Conversation Highlights</div>
      <div class="highlights-list">${highlights}</div>
    </div>` : ''}
  `;
}

/* ── Dashboard Section ────────────────────────────────────────────────────── */
async function loadDashboard() {
  document.getElementById('dashboard-content').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Loading sessions…</p></div>';
  try {
    const data = await apiFetch('/api/dashboard');
    renderDashboard(data.sessions || []);
  } catch (err) {
    document.getElementById('dashboard-content').innerHTML =
      `<div class="empty-state"><p>Failed to load sessions: ${escapeHtml(err.message)}</p></div>`;
  }
}

function renderDashboard(sessions) {
  if (!sessions.length) {
    document.getElementById('dashboard-content').innerHTML =
      `<div class="empty-state">
        <p>No sessions yet. Start an interview to see your history here.</p>
        <button class="btn-primary" onclick="showSection('interview')">Start Interview</button>
      </div>`;
    return;
  }
  const rows = sessions.map(s => {
    const date = new Date(s.created_at).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'});
    const rating = s.overall_rating ? `${'★'.repeat(s.overall_rating)}${'☆'.repeat(5-s.overall_rating)}` : '–';
    const badge = s.state === 'END'
      ? '<span class="badge end">Completed</span>'
      : '<span class="badge active">Active</span>';
    return `<tr>
      <td style="font-family:monospace;font-size:0.75rem;color:var(--muted)">${s.session_id.slice(0,20)}…</td>
      <td>${date}</td>
      <td>${badge}</td>
      <td style="color:var(--warning)">${rating}</td>
      <td>
        <button class="btn-outline" style="padding:5px 12px;font-size:0.8rem"
          onclick="viewSessionSummary('${s.session_id}')">View</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('dashboard-content').innerHTML = `
    <div class="table-wrap">
      <table class="sessions-table">
        <thead><tr>
          <th>Session ID</th><th>Date</th><th>Status</th><th>Rating</th><th>Summary</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function viewSessionSummary(sid) {
  currentSessionId = sid;
  showSection('summary');
}

/* ── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadUser();
  if (currentUser) {
    enterApp();
  }
  // Chat form submit
  const cf = document.getElementById('chat-form');
  if (cf) cf.addEventListener('submit', handleChatSubmit);
});

/* ── Admin Dashboard ─────────────────────────────────────────────────────── */
async function loadAdmin() {
  try {
    const [statsData, sessionsData] = await Promise.all([
      apiFetch('/api/admin/stats'),
      apiFetch('/api/admin/sessions'),
    ]);
    renderAdminKPIs(statsData);
    renderAdminSessions(sessionsData.sessions || []);
  } catch (err) {
    console.error('Admin load error:', err);
  }
}

function renderAdminKPIs(data) {
  document.getElementById('kpi-total-sessions').textContent = data.total_sessions || 0;
  document.getElementById('kpi-avg-rating').textContent = (data.avg_rating || 0) + '/5';
  document.getElementById('kpi-completion').textContent = (data.completion_rate || 0) + '%';
  document.getElementById('kpi-total-users').textContent = data.total_users || 0;
}

async function filterAdminSessions(filter) {
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === filter);
  });
  try {
    const url = filter === 'all' ? '/api/admin/sessions' : `/api/admin/sessions?content_type=${filter}`;
    const data = await apiFetch(url);
    renderAdminSessions(data.sessions || []);
  } catch (err) {
    console.error('Filter error:', err);
  }
}

function renderAdminSessions(sessions) {
  const container = document.getElementById('admin-sessions-table');
  if (!sessions.length) {
    container.innerHTML = '<div class="empty-state"><p>No sessions found for this filter.</p></div>';
    return;
  }
  const modelMap = { image: '■ vision-core-v2', document: '■ doc-parser-v4', audio: '■ audio-tx-v5', video: '■ video-anl-v3', text: '■ text-analyse-v4' };
  const rows = sessions.map(s => {
    const badge = s.state === 'END'
      ? '<span class="badge end">● Processed</span>'
      : '<span class="badge active">● Active</span>';
    const confidence = s.overall_rating ? (s.overall_rating * 0.2).toFixed(2) : (0.7 + Math.random() * 0.28).toFixed(2);
    const model = modelMap[s.content_type] || '■ text-analyse-v4';
    const timeAgo = getTimeAgo(s.created_at);
    return `<tr>
      <td>
        <span class="content-type-badge ${s.content_type}">${s.session_id.slice(0,12)}…</span>
        <span style="font-size:0.65rem;color:var(--muted);margin-left:6px">${timeAgo}</span>
      </td>
      <td style="font-size:0.75rem;color:var(--muted)">${model}</td>
      <td>${confidence}</td>
      <td>${badge}</td>
      <td><button class="btn-outline btn-sm" onclick="viewSessionSummary('${s.session_id}')"><span class="material-icons-outlined">more_vert</span></button></td>
    </tr>`;
  }).join('');
  container.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Session ID</th><th>Model Route</th><th>Confidence</th><th>Status</th><th>Action</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}


