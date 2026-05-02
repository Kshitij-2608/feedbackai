/* ── State ────────────────────────────────────────────────────────────────── */
let currentUser = null;        // { user_id, name, email, token }
let currentSessionId = null;   // active interview session UUID
let pendingImageB64 = null;    // base64 of image from Upload section
let pendingImageName = null;   // filename
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
  currentUser = { user_id: data.user_id, name: data.name, email: data.email, token: data.token };
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
  // Start on interview section
  showSection('interview');
  initInterview();
}

/* ── Navigation ───────────────────────────────────────────────────────────── */
const SECTIONS = ['dashboard', 'upload', 'interview', 'summary', 'account'];

function showSection(name) {
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`).classList.toggle('hidden', s !== name);
    const link = document.getElementById(`nav-${s}`);
    if (link) link.classList.toggle('active', s === name);
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'summary') loadSummary();
}

/* ── Upload Section ───────────────────────────────────────────────────────── */
const dropZone = () => document.getElementById('upload-drop-zone');

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  setUploadFile(file);
}

function setUploadFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImageB64 = ev.target.result;
    pendingImageName = file.name;
    document.getElementById('upload-preview-img').src = pendingImageB64;
    document.getElementById('upload-preview-name').textContent = file.name;
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
  document.getElementById('attached-name').textContent = pendingImageName || 'image';
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
    if (file && file.type.startsWith('image/')) setUploadFile(file);
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
    const url = `/api/chat/init?session_id=${encodeURIComponent(currentSessionId)}&user_id=${currentUser.user_id}`;
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
