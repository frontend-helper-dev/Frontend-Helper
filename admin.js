/* =============================================
   ADMIN.JS
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJlgIFjNPIoQUbc98LxXS9e00eLKueBfY",
  authDomain: "frontend-helper-b3ae7.firebaseapp.com",
  projectId: "frontend-helper-b3ae7",
  storageBucket: "frontend-helper-b3ae7.firebasestorage.app",
  messagingSenderId: "694794448757",
  appId: "1:694794448757:web:520bdbd6ee52e804c0ed3c",
  measurementId: "G-80ZG930B26"
};

const ADMIN_EMAILS = ['nikita99didorenko@gmail.com'];

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    document.getElementById('adminDenied').style.display = '';
    return;
  }

  document.getElementById('adminPanel').style.display = '';
  loadAdminInfo(user);
});

function loadAdminInfo(user) {
  document.getElementById('adminName').textContent     = user.displayName || 'Не вказано';
  document.getElementById('adminEmail').textContent    = user.email;
  document.getElementById('adminVerified').textContent = user.emailVerified ? '✅ Так' : '❌ Ні';
  document.getElementById('statUsers').textContent     = '—';
  loadPrompt();
  setTimeout(loadHistory, 500);
}

// =============================================
// AI PROMPT — LOAD
// =============================================

async function loadPrompt() {
  try {
    const ref  = doc(db, 'ai-config', 'system-prompt');
    const snap = await getDoc(ref);
    const textarea = document.getElementById('systemPromptTextarea');
    if (!textarea) return;
    if (snap.exists() && snap.data().prompt) {
      textarea.value = snap.data().prompt;
    } else {
      textarea.value = `Ти AI-асистент сайту "Frontend Helper" — каталогу ресурсів для frontend розробників.

Відповідай ТІЛЬКИ на питання пов'язані з frontend розробкою та ресурсами сайту.
Якщо питання не по темі — ввічливо відмов.
Відповідай українською мовою. Будь корисним та лаконічним.`;
    }
  } catch (err) {
    console.error('Помилка завантаження промпту:', err);
  }
}

// =============================================
// AI PROMPT — SAVE
// =============================================

window.savePrompt = async function() {
  const textarea = document.getElementById('systemPromptTextarea');
  const btn      = document.getElementById('savePromptBtn');
  const status   = document.getElementById('saveStatus');
  if (!textarea) return;

  btn.disabled   = true;
  btn.textContent = '⏳ Зберігаємо...';

  try {
    const ref = doc(db, 'ai-config', 'system-prompt');
    await setDoc(ref, {
      prompt:    textarea.value,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email
    });

    status.classList.add('ai-save-status--visible');
    setTimeout(() => status.classList.remove('ai-save-status--visible'), 3000);
  } catch (err) {
    alert('Помилка збереження: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = '💾 Зберегти інструкції';
  }
};

// =============================================
// AI TEST
// =============================================

const OPENROUTER_KEY = "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";
const GEMINI_URL = "https://openrouter.ai/api/v1/chat/completions";

window.testAI = async function() {
  const input    = document.getElementById('aiTestInput');
  const result   = document.getElementById('aiTestResult');
  const textarea = document.getElementById('systemPromptTextarea');
  const text     = input?.value.trim();
  if (!text) return;

  result.textContent = '⏳ Думаю...';

  const body = {
    model: "meta-llama/llama-3.3-8b-instruct:free",
    messages: [
      { role: "system", content: textarea.value },
      { role: "user",   content: text }
    ]
  };

  try {
    const res  = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Frontend Helper'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('AI response:', data);
    if (!res.ok) {
      result.textContent = `❌ Помилка ${res.status}: ${data?.error?.message || JSON.stringify(data)}`;
      return;
    }
    const answer = data?.choices?.[0]?.message?.content || 'Немає відповіді';
    result.textContent = answer;

    // Зберегти в історію
    await saveHistory(text, answer, 'admin-test');
    loadHistory();
  } catch (err) {
    console.error('Fetch error:', err);
    result.textContent = '❌ ' + err.message;
  }
};

// =============================================
// HISTORY
// =============================================

async function saveHistory(question, answer, source) {
  try {
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js");
    await addDoc(collection(db, 'ai-history'), {
      question,
      answer,
      source: source || 'user',
      timestamp: new Date().toISOString(),
      userEmail: auth.currentUser?.email || 'anonymous'
    });
  } catch (err) {
    console.error('History save:', err);
  }
}

window.loadHistory = async function() {
  const container = document.getElementById('aiHistory');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--text-3);font-size:.85rem;padding:8px">⏳ Завантаження...</div>';
  try {
    const { getDocs, collection, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js");
    const q    = query(collection(db, 'ai-history'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      container.innerHTML = '<div style="color:var(--text-3);font-size:.85rem;padding:8px">Запитів ще немає</div>';
      return;
    }
    container.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      const item = document.createElement('div');
      item.style.cssText = 'background:var(--bg-3);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:.82rem';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="color:var(--text-3);font-size:.72rem">${new Date(data.timestamp).toLocaleString('uk')} · <strong>${data.userEmail}</strong></span>
          <span style="font-size:.7rem;padding:2px 7px;border-radius:4px;background:var(--surface);color:var(--text-3)">${data.source}</span>
        </div>
        <div style="color:var(--text);font-weight:600;margin-bottom:5px">❓ ${data.question}</div>
        <div style="color:var(--text-2);line-height:1.5">${(data.answer || '').slice(0,200)}${(data.answer||'').length > 200 ? '...' : ''}</div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;font-size:.85rem;padding:8px">❌ ${err.message}</div>`;
  }
};

window.clearHistory = async function() {
  if (!confirm('Видалити всю історію запитів? Це незворотна дія.')) return;
  try {
    const { getDocs, collection, deleteDoc } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js");
    const snap     = await getDocs(collection(db, 'ai-history'));
    const deletes  = [];
    snap.forEach(d => deletes.push(deleteDoc(d.ref)));
    await Promise.all(deletes);
    document.getElementById('aiHistory').innerHTML = '<div style="color:#4ade80;font-size:.85rem;padding:8px">✅ Історію очищено</div>';
  } catch (err) {
    alert('Помилка: ' + err.message);
  }
};

window.handleSignOut = async function() {
  localStorage.removeItem('fh-guest');
  await signOut(auth);
  window.location.href = 'auth.html';
};

window.copyAdminEmail = function() {
  navigator.clipboard.writeText(ADMIN_EMAILS[0]).then(() => {
    alert('Email скопійовано!');
  });
};

// Theme
const html      = document.documentElement;
const themeBtn  = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(t) {
  html.setAttribute('data-theme', t);
  themeIcon.textContent = t === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('fh-theme', t);
}
themeBtn.addEventListener('click', () => applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
applyTheme(localStorage.getItem('fh-theme') || 'dark');
