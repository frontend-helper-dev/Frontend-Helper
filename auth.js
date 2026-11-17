/* =============================================
   AUTH.JS — Firebase Authentication
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut
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

// EmailJS config
const EMAILJS_SERVICE  = 'service_j3db08m';
const EMAILJS_TEMPLATE = 'template_at3upzn';
const EMAILJS_KEY      = 'vjJsRtMqVejxklJfD';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// OTP state
let _otpCode     = '';
let _otpEmail    = '';
let _otpPass     = '';
let _otpName     = '';
let _otpTimer    = null;
let _otpExpires  = 0;
let _pendingUser = null; // Firebase user після реєстрації (ще не залогінений)

// Прапор — чи виконується зараз логін/реєстрація
let isProcessing = false;

// Якщо вже залогінений і підтверджений — відразу на головну
// Використовуємо one-time перевірку, а не постійний listener
onAuthStateChanged(auth, (user) => {
  if (isProcessing) return; // Не чіпаємо під час форми
  if (user && user.emailVerified) {
    window.location.href = 'index.html';
  }
});

// =============================================
// HELPERS
// =============================================

function showAlert(msg, type = 'error') {
  const el = document.getElementById('authAlert');
  el.textContent = msg;
  el.className   = `auth-alert auth-alert--${type}`;
  el.style.display = 'block';
}

function hideAlert() {
  const el = document.getElementById('authAlert');
  if (el) el.style.display = 'none';
}

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(inputId + 'Error');
  if (input) {
    input.classList.add('auth-input--error');
    input.classList.remove('auth-input--success');
    // Прибираємо при наступному введенні
    input.addEventListener('input', function clear() {
      input.classList.remove('auth-input--error');
      if (errorEl) errorEl.style.display = 'none';
      input.removeEventListener('input', clear);
    });
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
  }
}

function clearFieldErrors() {
  const fields = ['loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPassword', 'regPassword2'];
  fields.forEach(id => {
    const input   = document.getElementById(id);
    const errorEl = document.getElementById(id + 'Error');
    if (input) {
      input.classList.remove('auth-input--error');
      input.classList.remove('auth-input--success');
    }
    if (errorEl) errorEl.style.display = 'none';
  });
}

function highlightField(inputId, isError) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (isError) {
    input.classList.add('auth-input--error');
  } else {
    input.classList.remove('auth-input--error');
    input.style.borderColor = '';
    input.style.boxShadow   = '';
    input.style.background  = '';
  }
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text   = btn.querySelector('.auth-btn__text');
  const loader = btn.querySelector('.auth-btn__loader');
  btn.disabled = loading;
  if (text)   text.style.display   = loading ? 'none'   : '';
  if (loader) loader.style.display = loading ? 'inline' : 'none';
}

function firebaseError(code) {
  const map = {
    'auth/email-already-in-use':    'Цей email вже зареєстрований.',
    'auth/invalid-email':           'Неправильний формат email.',
    'auth/weak-password':           'Пароль занадто простий. Мінімум 6 символів.',
    'auth/user-not-found':          'Акаунт з таким email не знайдено.',
    'auth/wrong-password':          'Неправильний пароль.',
    'auth/invalid-credential':      'Неправильний email або пароль.',
    'auth/too-many-requests':       'Забагато спроб. Спробуй пізніше.',
    'auth/network-request-failed':  'Помилка мережі. Перевір з\'єднання.',
  };
  return map[code] || 'Помилка входу. Перевір email та пароль.';
}

// =============================================
// SWITCH TABS
// =============================================

window.switchTab = function(tab) {
  hideAlert();
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm   = document.getElementById('forgotForm');
  const tabLogin     = document.getElementById('tabLogin');
  const tabRegister  = document.getElementById('tabRegister');
  const divider      = document.getElementById('authDivider');
  const guestBtn     = document.getElementById('guestBtn');
  const tabs         = document.querySelector('.auth-tabs');

  loginForm.style.display    = 'none';
  registerForm.style.display = 'none';
  forgotForm.style.display   = 'none';
  tabLogin.classList.remove('auth-tab--active');
  tabRegister.classList.remove('auth-tab--active');

  if (tab === 'login') {
    loginForm.style.display = '';
    tabLogin.classList.add('auth-tab--active');
    divider.style.display  = '';
    guestBtn.style.display = '';
    tabs.style.display     = '';
  } else if (tab === 'register') {
    registerForm.style.display = '';
    tabRegister.classList.add('auth-tab--active');
    divider.style.display  = '';
    guestBtn.style.display = '';
    tabs.style.display     = '';
  } else if (tab === 'forgot') {
    forgotForm.style.display = '';
    divider.style.display   = 'none';
    guestBtn.style.display  = 'none';
    tabs.style.display      = 'none';
  }
};

// =============================================
// TOGGLE PASSWORD
// =============================================

window.togglePass = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type      = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
};

// =============================================
// LOGIN
// =============================================

window.handleLogin = async function(e) {
  e.preventDefault();
  hideAlert();
  clearFieldErrors();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // --- Валідація email ---
  let hasError = false;

  if (!email) {
    setFieldError('loginEmail', 'Введіть email адресу');
    hasError = true;
  } else if (!email.includes('@')) {
    setFieldError('loginEmail', 'Ви ввели неправильний email — пропущений символ @');
    hasError = true;
  } else if (!email.includes('.') || email.indexOf('.') === email.length - 1) {
    setFieldError('loginEmail', 'Ви ввели неправильний email — перевірте формат (наприклад: name@gmail.com)');
    hasError = true;
  } else if (email.split('@')[1]?.length < 3) {
    setFieldError('loginEmail', 'Ви ввели неправильний email — домен занадто короткий');
    hasError = true;
  }

  // --- Валідація пароля ---
  if (!password) {
    setFieldError('loginPassword', 'Введіть пароль');
    hasError = true;
  } else if (password.length < 6) {
    setFieldError('loginPassword', 'Пароль занадто короткий — мінімум 6 символів');
    hasError = true;
  }

  if (hasError) return;

  isProcessing = true;
  setLoading('loginBtn', true);

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Входимо без перевірки підтвердження email
    window.location.href = 'index.html';

  } catch (err) {
    isProcessing = false;
    setLoading('loginBtn', false);
    if (err.code === 'auth/user-not-found') {
      setFieldError('loginEmail', 'Акаунту з таким email не існує. Перевірте або зареєструйтесь.');
    } else if (err.code === 'auth/wrong-password') {
      setFieldError('loginPassword', 'Невірний пароль. Спробуйте ще раз або скиньте пароль.');
    } else if (err.code === 'auth/invalid-credential') {
      setFieldError('loginEmail', 'Невірний email або пароль.');
      setFieldError('loginPassword', 'Перевірте дані та спробуйте ще раз.');
    } else if (err.code === 'auth/invalid-email') {
      setFieldError('loginEmail', 'Невірний формат email.');
    } else if (err.code === 'auth/too-many-requests') {
      showAlert('❌ Забагато спроб. Почекайте або скиньте пароль через "Забув пароль?".', 'error');
    } else {
      showAlert(firebaseError(err.code), 'error');
    }
  }
};

// Кнопка повторного надсилання листа (динамічна)
function showResendBtn(email, password) {
  const existing = document.getElementById('resendInlineBtn');
  if (existing) return;

  const btn = document.createElement('button');
  btn.id        = 'resendInlineBtn';
  btn.type      = 'button';
  btn.className = 'auth-btn auth-btn--guest';
  btn.textContent = '📧 Надіслати лист підтвердження ще раз';
  btn.style.marginTop = '4px';

  btn.onclick = async () => {
    btn.disabled     = true;
    btn.textContent  = '⏳ Надсилаємо...';
    isProcessing     = true;
    try {
      const r = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(r.user);
      await signOut(auth);
      showAlert('✅ Лист надіслано! Перевір пошту.', 'success');
      btn.textContent = '✅ Надіслано';
    } catch {
      showAlert('Не вдалося надіслати лист. Спробуй ще раз.', 'error');
      btn.disabled    = false;
      btn.textContent = '📧 Надіслати ще раз';
    } finally {
      isProcessing = false;
    }
  };

  document.getElementById('loginForm').appendChild(btn);
}

// =============================================
// REGISTER
// =============================================

window.handleRegister = async function(e) {
  e.preventDefault();
  hideAlert();

  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass1 = document.getElementById('regPassword').value;
  const pass2 = document.getElementById('regPassword2').value;

  if (!name || !email || !pass1 || !pass2) {
    showAlert('Заповни всі поля.');
    return;
  }
  if (pass1 !== pass2) {
    showAlert('Паролі не збігаються.');
    return;
  }
  if (pass1.length < 6) {
    showAlert('Пароль мінімум 6 символів.');
    return;
  }

  isProcessing = true;
  setLoading('registerBtn', true);

  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass1);
    await updateProfile(result.user, { displayName: name });
    isProcessing = false;
    window.location.href = 'index.html';
  } catch (err) {
    isProcessing = false;
    setLoading('registerBtn', false);
    showAlert(firebaseError(err.code));
  }
};

// =============================================
// OTP — SEND
// =============================================

async function sendOTPEmail(email, name) {
  // Генеруємо 6-значний код
  _otpCode    = String(Math.floor(100000 + Math.random() * 900000));
  _otpExpires = Date.now() + 10 * 60 * 1000; // 10 хвилин

  // Чекаємо поки EmailJS завантажиться
  let attempts = 0;
  while (!window.emailjs && attempts < 20) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!window.emailjs) {
    throw new Error('EmailJS не завантажено. Перезавантаж сторінку.');
  }

  try {
    emailjs.init(EMAILJS_KEY);
    const result = await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email: email,
      email:    email,
      passcode: _otpCode,
      otp:      _otpCode,
      code:     _otpCode,
      time:     new Date().toLocaleTimeString('uk'),
      to_name:  name || 'Користувачу',
      from_name: 'Frontend Helper'
    });
    console.log('EmailJS result:', result);
  } catch (err) {
    console.error('EmailJS error:', err);
    throw new Error('Не вдалося надіслати код: ' + (err?.text || err?.message || JSON.stringify(err)));
  }
}

// =============================================
// OTP — INIT INPUTS
// =============================================

function initOTPInputs() {
  startOTPTimer();
  for (let i = 0; i < 6; i++) {
    const input = document.getElementById(`otp${i}`);
    if (!input) continue;
    input.value = '';
    input.classList.remove('otp-input--filled', 'otp-input--error');

    input.addEventListener('input', function() {
      // Тільки цифри
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value) {
        this.classList.add('otp-input--filled');
        // Переходимо до наступного
        const next = document.getElementById(`otp${i + 1}`);
        if (next) next.focus();
      } else {
        this.classList.remove('otp-input--filled');
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value) {
        const prev = document.getElementById(`otp${i - 1}`);
        if (prev) { prev.focus(); prev.value = ''; prev.classList.remove('otp-input--filled'); }
      }
      if (e.key === 'Enter') verifyOTP();
    });

    input.addEventListener('paste', function(e) {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      for (let j = 0; j < 6 && j < pasted.length; j++) {
        const inp = document.getElementById(`otp${j}`);
        if (inp) { inp.value = pasted[j]; inp.classList.add('otp-input--filled'); }
      }
      const last = document.getElementById(`otp${Math.min(5, pasted.length - 1)}`);
      if (last) last.focus();
    });
  }
  // Фокус на перше поле
  setTimeout(() => document.getElementById('otp0')?.focus(), 300);
}

// =============================================
// OTP — TIMER
// =============================================

function startOTPTimer() {
  clearInterval(_otpTimer);
  const timerEl = document.getElementById('otpTimer');
  _otpTimer = setInterval(() => {
    const left = Math.max(0, _otpExpires - Date.now());
    const m    = Math.floor(left / 60000);
    const s    = Math.floor((left % 60000) / 1000);
    if (timerEl) timerEl.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if (left <= 0) {
      clearInterval(_otpTimer);
      if (timerEl) timerEl.textContent = '0:00';
      showOTPAlert('⏰ Час вийшов. Надішли новий код.', 'error');
    }
  }, 1000);
}

// =============================================
// OTP — VERIFY
// =============================================

window.verifyOTP = async function() {
  const entered = [0,1,2,3,4,5].map(i => document.getElementById(`otp${i}`)?.value || '').join('');

  if (entered.length < 6) {
    showOTPAlert('Введи всі 6 цифр коду.', 'error');
    return;
  }

  if (Date.now() > _otpExpires) {
    showOTPAlert('⏰ Час коду вийшов. Натисни "Надіслати ще раз".', 'error');
    return;
  }

  if (entered !== _otpCode) {
    showOTPAlert('❌ Невірний код. Перевір пошту і спробуй ще раз.', 'error');
    for (let i = 0; i < 6; i++) {
      document.getElementById(`otp${i}`)?.classList.add('otp-input--error');
    }
    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        document.getElementById(`otp${i}`)?.classList.remove('otp-input--error');
      }
    }, 1000);
    return;
  }

  // Код правильний — реєструємо у Firebase
  setLoading('otpVerifyBtn', true);
  isProcessing = true;
  try {
    const result = await createUserWithEmailAndPassword(auth, _otpEmail, _otpPass);
    await updateProfile(result.user, { displayName: _otpName });
    clearInterval(_otpTimer);
    // Редірект — onAuthStateChanged спрацює
    window.location.href = 'index.html';
  } catch (err) {
    isProcessing = false;
    setLoading('otpVerifyBtn', false);
    showOTPAlert(firebaseError(err.code), 'error');
  }
};

// =============================================
// OTP — RESEND
// =============================================

window.resendOTP = async function() {
  const btn = document.getElementById('otpResendBtn');
  btn.disabled    = true;
  btn.textContent = '⏳ Надсилаємо...';
  try {
    await sendOTPEmail(_otpEmail, _otpName);
    initOTPInputs();
    showOTPAlert('✅ Новий код надіслано!', 'success');
  } catch {
    showOTPAlert('Помилка надсилання. Спробуй ще раз.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '📧 Надіслати код ще раз';
  }
};

// =============================================
// OTP — BACK TO REGISTER
// =============================================

window.backToRegister = function() {
  clearInterval(_otpTimer);
  _otpCode = '';
  document.getElementById('verifyNotice').style.display = 'none';
  document.getElementById('authCard').style.display     = '';
  switchTab('register');
};

function showOTPAlert(msg, type = 'error') {
  const el = document.getElementById('otpAlert');
  if (!el) return;
  el.textContent   = msg;
  el.className     = `auth-alert auth-alert--${type}`;
  el.style.display = 'block';
}

// =============================================
// RESEND VERIFICATION (старий — більше не потрібен)
// =============================================

window.resendVerification = function() {};


// =============================================
// FORGOT PASSWORD
// =============================================

window.handleForgot = async function(e) {
  e.preventDefault();
  hideAlert();
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) { showAlert('Введи email.'); return; }

  setLoading('forgotBtn', true);
  try {
    await sendPasswordResetEmail(auth, email);
    showAlert('✅ Лист надіслано! Перевір пошту та перейди за посиланням.', 'success');
  } catch (err) {
    showAlert(firebaseError(err.code));
  } finally {
    setLoading('forgotBtn', false);
  }
};

// =============================================
// GUEST MODE
// =============================================

window.handleGuest = function() {
  localStorage.setItem('fh-guest', 'true');
  window.location.href = 'index.html';
};
