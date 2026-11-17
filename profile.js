/* =============================================
   PROFILE.JS
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJlgIFjNPIoQUbc98LxXS9e00eLKueBfY",
  authDomain: "frontend-helper-b3ae7.firebaseapp.com",
  projectId: "frontend-helper-b3ae7",
  storageBucket: "frontend-helper-b3ae7.firebasestorage.app",
  messagingSenderId: "694794448757",
  appId: "1:694794448757:web:520bdbd6ee52e804c0ed3c",
  measurementId: "G-80ZG930B26"
};

const ADMIN_EMAIL = 'nikita99didorenko@gmail.com';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentUser = null;

// =============================================
// AUTH GUARD
// =============================================

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  currentUser = user;
  loadProfile(user);
});

function loadProfile(user) {
  const name     = user.displayName || '';
  const email    = user.email || '';
  const photo    = user.photoURL || '';
  const verified = user.emailVerified;
  const isAdmin  = email === ADMIN_EMAIL;

  // Header info
  document.getElementById('profileName').textContent  = name || 'Без імені';
  document.getElementById('profileEmail').textContent = email;

  // Verified badge
  const verEl = document.getElementById('profileVerified');
  verEl.textContent = verified ? '✅ Email підтверджено' : '⚠️ Email не підтверджено';
  verEl.className   = 'profile-verified ' + (verified ? 'profile-verified--yes' : 'profile-verified--no');

  // Admin badge
  if (isAdmin) document.getElementById('adminBadge').style.display = '';

  // Avatar
  updateAvatar(name, photo);

  // Fill form fields
  document.getElementById('editName').value     = name;
  document.getElementById('editPhotoUrl').value = photo;
  // Show email for password reset
  const passEmailEl = document.getElementById('passEmailValue');
  if (passEmailEl) passEmailEl.textContent = email;
}

function updateAvatar(name, photoUrl) {
  const img      = document.getElementById('profileAvatarImg');
  const initials = document.getElementById('profileAvatarInitials');

  if (photoUrl) {
    img.src = photoUrl;
    img.style.display = '';
    initials.style.display = 'none';
    img.onerror = () => {
      img.style.display = 'none';
      initials.style.display = '';
    };
  } else {
    img.style.display = 'none';
    initials.style.display = '';
    initials.textContent = name ? name.slice(0,2).toUpperCase() : '?';
  }
}

// =============================================
// PREVIEW PHOTO
// =============================================

window.previewPhoto = function() {
  const url     = document.getElementById('editPhotoUrl').value.trim();
  const preview = document.getElementById('photoPreview');
  const img     = document.getElementById('photoPreviewImg');

  if (!url) {
    showAlert('Введи посилання на фото.', 'error');
    return;
  }

  img.src = url;
  preview.style.display = '';
  img.onerror = () => {
    showAlert('Не вдалося завантажити фото. Перевір посилання.', 'error');
    preview.style.display = 'none';
  };
  img.onload = () => hideAlert();
};

// =============================================
// SAVE PROFILE
// =============================================

window.saveProfile = async function(e) {
  e.preventDefault();
  if (!currentUser) return;

  const name  = document.getElementById('editName').value.trim();
  const photo = document.getElementById('editPhotoUrl').value.trim();

  if (!name) { showAlert('Введи ім\'я.', 'error'); return; }

  setLoading('saveBtn', true);
  try {
    await updateProfile(currentUser, {
      displayName: name,
      photoURL:    photo || null
    });

    // Reload
    loadProfile(currentUser);
    showAlert('✅ Профіль оновлено!', 'success');
  } catch (err) {
    showAlert('Помилка: ' + err.message, 'error');
  } finally {
    setLoading('saveBtn', false);
  }
};

// =============================================
// SEND PASSWORD RESET EMAIL
// =============================================

window.sendPasswordReset = async function() {
  if (!currentUser) return;
  const email = currentUser.email;
  const passAlert = document.getElementById('passAlert');

  function showPassAlert(msg, type) {
    passAlert.textContent  = msg;
    passAlert.className    = `auth-alert auth-alert--${type}`;
    passAlert.style.display = '';
  }

  setLoading('passBtn', true);
  try {
    await sendPasswordResetEmail(auth, email);
    showPassAlert(`✅ Лист надіслано на ${email}! Перейди за посиланням у листі щоб змінити пароль.`, 'success');
  } catch (err) {
    showPassAlert('Помилка: ' + err.message, 'error');
  } finally {
    setLoading('passBtn', false);
  }
};

// =============================================
// SIGN OUT
// =============================================

window.handleSignOut = async function() {
  localStorage.removeItem('fh-guest');
  await signOut(auth);
  window.location.href = 'auth.html';
};

// =============================================
// HELPERS
// =============================================

function showAlert(msg, type = 'error') {
  const el = document.getElementById('profileAlert');
  el.textContent = msg;
  el.className   = `auth-alert auth-alert--${type}`;
  el.style.display = '';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const el = document.getElementById('profileAlert');
  if (el) el.style.display = 'none';
}

function setLoading(btnId, loading) {
  const btn    = document.getElementById(btnId);
  if (!btn) return;
  const text   = btn.querySelector('.auth-btn__text');
  const loader = btn.querySelector('.auth-btn__loader');
  btn.disabled = loading;
  if (text)   text.style.display   = loading ? 'none' : '';
  if (loader) loader.style.display = loading ? '' : 'none';
}

window.togglePass = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type   = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
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
