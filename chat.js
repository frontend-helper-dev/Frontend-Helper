/* =============================================
   CHAT.JS — Gemini AI Chat Widget
   ============================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJlgIFjNPIoQUbc98LxXS9e00eLKueBfY",
  authDomain: "frontend-helper-b3ae7.firebaseapp.com",
  projectId: "frontend-helper-b3ae7",
  storageBucket: "frontend-helper-b3ae7.firebasestorage.app",
  messagingSenderId: "694794448757",
  appId: "1:694794448757:web:520bdbd6ee52e804c0ed3c"
};

const OPENROUTER_KEY = "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";
const GEMINI_URL = "https://openrouter.ai/api/v1/chat/completions";

// Init Firebase (avoid duplicate)
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// =============================================
// STATE
// =============================================

let isOpen        = false;
let isTyping      = false;
let systemPrompt  = '';
let chatHistory   = []; // {role, text}
let currentUser   = null;
let unreadCount   = 0;

const DEFAULT_PROMPT = `Ти AI-асистент сайту "Frontend Helper" — каталогу ресурсів для frontend розробників.

Сайт містить 8 категорій ресурсів:
1. Документація (MDN, DevDocs, CSS-Tricks, JavaScript.info, web.dev, Can I Use, TypeScript, React Docs)
2. Інструменти (VS Code, Vite, Prettier, ESLint, Figma, GitHub, Storybook, npm)
3. UI Бібліотеки (Tailwind CSS, Bootstrap, shadcn/ui, DaisyUI, Material UI, Ant Design, Chakra UI, Vuetify)
4. Іконки & Шрифти (Google Fonts, Font Awesome, Lucide, Heroicons, Iconify, Unsplash, SVG Repo, Fontsource)
5. Навчання (freeCodeCamp, The Odin Project, Frontend Masters, Traversy Media, Fireship, roadmap.sh)
6. Кольори & Дизайн (Coolors, Color Hunt, UI Gradients, Happy Hues, Dribbble, Awwwards, CSS Gradient)
7. Перформанс & Тестування (PageSpeed, GTmetrix, WAVE, Vitest, Playwright, Bundlephobia, WebPageTest)
8. Деплой & Хостинг (Vercel, Netlify, GitHub Pages, Firebase, Cloudflare Pages, Railway, Supabase, Render)

ПРАВИЛА:
- Відповідай ТІЛЬКИ на питання пов'язані з frontend розробкою, веб-технологіями та ресурсами сайту
- Якщо питання не стосується frontend/веб — ввічливо відмов і поверни до теми
- Давай конкретні, корисні відповіді з прикладами
- Рекомендуй ресурси з сайту де це доречно
- Відповідай українською мовою
- Будь дружнім та лаконічним`;

// =============================================
// LOAD SYSTEM PROMPT FROM FIRESTORE
// =============================================

async function loadSystemPrompt() {
  try {
    const ref  = doc(db, 'ai-config', 'system-prompt');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().prompt) {
      systemPrompt = snap.data().prompt;
    } else {
      systemPrompt = DEFAULT_PROMPT;
    }
  } catch {
    systemPrompt = DEFAULT_PROMPT;
  }
}

// Listen for real-time prompt updates
function listenPromptUpdates() {
  const ref = doc(db, 'ai-config', 'system-prompt');
  onSnapshot(ref, (snap) => {
    if (snap.exists() && snap.data().prompt) {
      systemPrompt = snap.data().prompt;
    }
  });
}

// =============================================
// BUILD UI
// =============================================

function buildChatUI() {
  // FAB button
  const fab = document.createElement('button');
  fab.id        = 'chatFab';
  fab.className = 'chat-fab';
  fab.title     = 'AI Асистент';
  fab.innerHTML = `<span class="chat-fab__icon">🤖</span>`;
  fab.addEventListener('click', toggleChat);
  document.body.appendChild(fab);

  // Chat window
  const win = document.createElement('div');
  win.id        = 'chatWindow';
  win.className = 'chat-window';
  win.innerHTML = `
    <div class="chat-header">
      <div class="chat-header__avatar">🤖</div>
      <div class="chat-header__info">
        <div class="chat-header__name">Frontend AI</div>
        <div class="chat-header__status">Онлайн</div>
      </div>
      <button class="chat-header__close" onclick="toggleChat()">✕</button>
    </div>
    <div class="chat-messages" id="chatMessages">
      <div class="chat-welcome">
        <div class="chat-welcome__icon">👋</div>
        <div class="chat-welcome__title">Привіт! Я Frontend AI</div>
        <div class="chat-welcome__text">Запитай мене про будь-який frontend інструмент, бібліотеку або ресурс з сайту</div>
        <div class="chat-quick">
          <button class="chat-quick__btn" onclick="sendQuick('Які найкращі ресурси для вивчення CSS?')">🎨 Ресурси для вивчення CSS</button>
          <button class="chat-quick__btn" onclick="sendQuick('Порекомендуй UI бібліотеку для React')">⚛️ UI бібліотека для React</button>
          <button class="chat-quick__btn" onclick="sendQuick('Як задеплоїти сайт безкоштовно?')">🚀 Безкоштовний хостинг</button>
        </div>
      </div>
    </div>
    <div class="chat-input-area">
      <textarea
        id="chatInput"
        class="chat-input"
        placeholder="Запитай про frontend..."
        rows="1"
      ></textarea>
      <button class="chat-send" id="chatSendBtn" onclick="sendMessage()">➤</button>
    </div>
  `;
  document.body.appendChild(win);

  // Enter to send (Shift+Enter = newline)
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  document.getElementById('chatInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
}

// =============================================
// TOGGLE CHAT
// =============================================

window.toggleChat = function() {
  isOpen = !isOpen;
  const win = document.getElementById('chatWindow');
  const fab = document.getElementById('chatFab');
  const badge = fab.querySelector('.chat-fab__badge');

  win.classList.toggle('chat-window--open', isOpen);
  fab.classList.toggle('chat-fab--open', isOpen);

  if (isOpen) {
    unreadCount = 0;
    if (badge) badge.remove();
    setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
  }
};

// =============================================
// ADD MESSAGE TO UI
// =============================================

function addMessage(role, text) {
  const container = document.getElementById('chatMessages');

  // Remove welcome screen on first real message
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const isUser = role === 'user';
  const initials = currentUser?.displayName
    ? currentUser.displayName.slice(0,1).toUpperCase()
    : '👤';

  const msg = document.createElement('div');
  msg.className = `chat-msg ${isUser ? 'chat-msg--user' : ''}`;
  msg.innerHTML = `
    <div class="chat-msg__avatar">${isUser ? initials : '🤖'}</div>
    <div class="chat-msg__bubble">${escapeHtml(text)}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;

  // Add unread badge if chat is closed
  if (!isOpen && role === 'ai') {
    unreadCount++;
    const fab = document.getElementById('chatFab');
    let badge = fab.querySelector('.chat-fab__badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'chat-fab__badge';
      fab.appendChild(badge);
    }
    badge.textContent = unreadCount;
  }
}

function showTyping() {
  const container = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.id        = 'chatTyping';
  typing.className = 'chat-msg';
  typing.innerHTML = `
    <div class="chat-msg__avatar">🤖</div>
    <div class="chat-typing"><span></span><span></span><span></span></div>
  `;
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  document.getElementById('chatTyping')?.remove();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--bg-3);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:.85em">$1</code>');
}

// =============================================
// SEND MESSAGE
// =============================================

window.sendMessage = async function() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || isTyping) return;

  input.value = '';
  input.style.height = 'auto';

  addMessage('user', text);
  chatHistory.push({ role: 'user', text });

  await getAIResponse(text);
};

window.sendQuick = function(text) {
  const input = document.getElementById('chatInput');
  input.value = text;
  sendMessage();
};

// =============================================
// GEMINI API CALL
// =============================================

async function getAIResponse(userText) {
  isTyping = true;
  document.getElementById('chatSendBtn').disabled = true;
  showTyping();

  // Build messages для OpenRouter (OpenAI формат)
  const messages = [
    { role: 'system', content: systemPrompt || DEFAULT_PROMPT }
  ];

  // Додаємо історію (останні 6 повідомлень)
  const recentHistory = chatHistory.slice(-7, -1);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    });
  }

  messages.push({ role: 'user', content: userText });

  const body = {
    model: "meta-llama/llama-3.3-8b-instruct:free",
    messages,
    temperature: 0.7,
    max_tokens: 800
  };

  try {
    const res = await fetch(GEMINI_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Frontend Helper'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || 'API error');
    }

    const data   = await res.json();
    const aiText = data?.choices?.[0]?.message?.content || 'Вибач, не вдалося отримати відповідь.';

    removeTyping();
    addMessage('ai', aiText);
    chatHistory.push({ role: 'ai', text: aiText });

  } catch (err) {
    removeTyping();
    const errMsg = err.message.includes('API_KEY')
      ? '⚠️ Помилка API ключа. Перевір налаштування.'
      : '⚠️ Помилка з\'єднання. Спробуй ще раз.';
    addMessage('ai', errMsg);
  } finally {
    isTyping = false;
    document.getElementById('chatSendBtn').disabled = false;
    document.getElementById('chatInput')?.focus();
  }
}

// =============================================
// INIT
// =============================================

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

// Load prompt and start
loadSystemPrompt().then(() => {
  listenPromptUpdates();
  buildChatUI();
});
