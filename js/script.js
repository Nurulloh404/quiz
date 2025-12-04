const QUESTION_FILE = './json/questions.json';
const LEVEL = 'N3';
const params = new URLSearchParams(window.location.search);
const subject = params.get('subject') || '文法';

let questions = [];
let questionPool = null;
let timer;
let timeLeft = 3600;
let userAnswers = [];
let lastConfig = { count: 20, time: 60 };
let testStartedAt = null;
let liveCorrect = 0;
let liveIncorrect = 0;
let questionStatus = [];

const startModal = document.getElementById('start-settings-modal');
const resultBox = document.getElementById('result');
const answersReview = document.getElementById('answers-review');
const retakeButton = document.getElementById('retake-test');
const postActions = document.getElementById('post-actions');
const liveFooter = document.getElementById('live-footer');
const liveCorrectElem = document.getElementById('live-correct');
const liveIncorrectElem = document.getElementById('live-incorrect');
const liveRemainingElem = document.getElementById('live-remaining');

window.onload = () => {
  if (startModal) startModal.style.display = 'flex';
  const title = document.getElementById('test-title');
  if (title) title.textContent = `日本語オンラインテスト： ${subject}`;
};

document.addEventListener('DOMContentLoaded', () => {
  const themeButton = document.getElementById('toggle-theme');
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    if (themeButton) themeButton.textContent = '☀️';
  }

  themeButton?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    if (themeButton) themeButton.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
});

document.getElementById('start-test-btn')?.addEventListener('click', () => {
  const count = parseInt(document.getElementById('question-count').value, 10) || 20;
  const time = parseInt(document.getElementById('time-limit').value, 10) || 60;
  lastConfig = { count, time };
  beginTest(lastConfig);
});

retakeButton?.addEventListener('click', () => {
  if (!questionPool) {
    if (startModal) startModal.style.display = 'flex';
    return;
  }
  beginTest(lastConfig);
});

document.getElementById('view-stats-btn')?.addEventListener('click', () => {
  window.location.href = 'mypage.html';
});

document.getElementById('questions-container')?.addEventListener('change', handleOptionSelect);

// Вопросы
function displayQuestions() {
  const container = document.getElementById("questions-container");
  container.innerHTML = '';
  questionStatus = [];

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'question';
    let html = `<p><strong>${index + 1}. ${q.question}</strong></p>`;

    if (q.image) {
      html += `<img src="${q.image}" alt="question image" style="max-width: 300px;"><br>`;
    }

    const options = shuffleArray(q.options.map((opt, i) =>
      typeof opt === 'string' ? { text: opt, index: i } : { ...opt, index: i }
    ));

    options.forEach(opt => {
      const id = `q${index}_o${opt.index}`;
      html += `<label><input type="radio" name="q${index}" value="${opt.index}">`;
      html += opt.image
        ? ` <img src="${opt.image}" alt="option image" style="max-width: 150px;">`
        : ` ${opt.text}`;
      html += `</label><br>`;
    });

    div.innerHTML = html;
    container.appendChild(div);
  });
}

function formatOption(opt) {
  if (typeof opt === 'string') return opt;
  if (!opt) return '---';
  if (opt.text) return opt.text;
  if (opt.image) return '画像';
  return '---';
}

async function beginTest(config) {
  resetUI();
  const data = await loadQuestionPool();
  const pool = data[subject] || [];
  questions = shuffleArray([...pool]).slice(0, config.count);
  timeLeft = config.time * 60;
  testStartedAt = Date.now();
  liveCorrect = 0;
  liveIncorrect = 0;

  displayQuestions();
  questionStatus = Array(questions.length).fill(null);
  updateLiveFooter();
  startTimer();
  if (startModal) startModal.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadQuestionPool() {
  if (questionPool) return questionPool;
  const res = await fetch(QUESTION_FILE);
  questionPool = await res.json();
  return questionPool;
}

function resetUI() {
  clearInterval(timer);
  document.getElementById('questions-container').innerHTML = '';
  resultBox.innerHTML = '';
  answersReview.innerHTML = '';
  postActions?.classList.add('hidden');
  liveFooter?.classList.remove('hidden');
}

function startTimer() {
  clearInterval(timer);
  const timerElem = document.getElementById("timer");
  timer = setInterval(() => {
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    timerElem.textContent = `⏱ ${minutes}:${seconds}`;
    if (--timeLeft < 0) {
      clearInterval(timer);
      submitTest();
    }
  }, 1000);
}

function shuffleArray(arr) {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

// Подтверждение завершения
const stopBtn = document.getElementById("stop_test");
const backBtn = document.getElementById("back_button");
const cancelBtn = document.getElementById("cancel-test-btn");

if (stopBtn) {
  stopBtn.addEventListener("click", () => {
    document.getElementById("confirm-end-modal").style.display = "flex";
  });

  document.getElementById("confirm-end-yes").addEventListener("click", () => {
    document.getElementById("confirm-end-modal").style.display = "none";
    submitTest();
  });

  document.getElementById("confirm-end-no").addEventListener("click", () => {
    document.getElementById("confirm-end-modal").style.display = "none";
  });
}

if (backBtn) {
  backBtn.addEventListener("click", () => {
    document.getElementById("confirm-exit-modal").style.display = "flex";
  });

  document.getElementById("confirm-exit-yes").addEventListener("click", () => {
    window.location.href = 'index.html';
  });

  document.getElementById("confirm-exit-no").addEventListener("click", () => {
    document.getElementById("confirm-exit-modal").style.display = "none";
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// Проверка
function submitTest() {
  clearInterval(timer);
  const allQuestions = document.querySelectorAll('.question');
  let correctCount = questionStatus.filter(status => status === 'correct').length;
  userAnswers = [];

  questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    const selectedIndex = selected ? parseInt(selected.value, 10) : -1;
    userAnswers.push(selectedIndex);

    const options = allQuestions[i].querySelectorAll('input[type=radio]');
    options.forEach(opt => {
      const optIndex = parseInt(opt.value, 10);
      const label = opt.parentElement;

      if (opt.checked) label.classList.add('selected-choice');
      if (optIndex === q.answer) label.classList.add('correct-answer');
      if (opt.checked && optIndex === q.answer) {
        label.classList.add('correct');
      } else if (opt.checked && optIndex !== q.answer) {
        label.classList.add('incorrect');
      }

      opt.disabled = true;
    });
  });

  const durationSec = getDurationSeconds();
  const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  renderResultSummary(correctCount, accuracy, durationSec);
  renderAnswerReview();
  saveResult(correctCount, accuracy, durationSec);
  postActions?.classList.remove('hidden');
  liveFooter?.classList.add('hidden');
}

function renderAnswerReview() {
  answersReview.innerHTML = '';
  questions.forEach((q, index) => {
    const userChoice = userAnswers[index];
    const card = document.createElement('div');
    card.className = 'answer-card';
    const isCorrect = userChoice === q.answer;

    card.innerHTML = `
      <div class="answer-card__header">
        <h4>${index + 1}. ${q.question}</h4>
        <span class="pill ${isCorrect ? 'pill--success' : 'pill--danger'}">${isCorrect ? '正解' : '間違い'}</span>
      </div>
      <p class="answer-meta">正解: ${formatOption(q.options[q.answer])}</p>
      <p class="answer-meta ${isCorrect ? 'text-success' : 'text-danger'}">
        あなた: ${userChoice >= 0 ? formatOption(q.options[userChoice]) : '未選択'}
      </p>
    `;

    answersReview.appendChild(card);
  });
}

function renderResultSummary(correctCount, accuracy, durationSec) {
  const result = document.createElement('div');
  result.className = 'result-summary';
  result.innerHTML = `
    <div class="score-badge">${correctCount}<span>/ ${questions.length}</span></div>
    <div class="result-meta">
      <div>
        <p class="muted">正解率</p>
        <p class="result-strong">${accuracy}%</p>
      </div>
      <div>
        <p class="muted">所要時間</p>
        <p class="result-strong">${formatDuration(durationSec)}</p>
      </div>
    </div>
  `;
  resultBox.innerHTML = '';
  resultBox.appendChild(result);
}

function getDurationSeconds() {
  if (!testStartedAt) return 0;
  const elapsed = Math.floor((Date.now() - testStartedAt) / 1000);
  return Math.min(elapsed, (lastConfig.time || 0) * 60);
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function saveResult(correctCount, accuracy, durationSec) {
  const payload = {
    id: (crypto.randomUUID ? crypto.randomUUID() : `result-${Date.now()}`),
    level: LEVEL,
    subject,
    correct: correctCount,
    total: questions.length,
    accuracy,
    durationSec,
    timeLimitSec: (lastConfig.time || 0) * 60,
    startedAt: testStartedAt ? new Date(testStartedAt).toISOString() : null,
    finishedAt: new Date().toISOString(),
    page: window.location.pathname.split('/').pop()
  };

  const existing = JSON.parse(localStorage.getItem('quizResults') || '[]');
  existing.unshift(payload);
  const trimmed = existing.slice(0, 50); // limit storage growth
  localStorage.setItem('quizResults', JSON.stringify(trimmed));
}

function handleOptionSelect(event) {
  const target = event.target;
  if (!target.matches('input[type="radio"][name^="q"]')) return;
  const name = target.name;
  const qIndex = parseInt(name.replace('q', ''), 10);
  if (Number.isNaN(qIndex) || questionStatus[qIndex]) return;

  const selectedIndex = parseInt(target.value, 10);
  const q = questions[qIndex];
  if (!q) return;

  const questionEl = document.querySelectorAll('.question')[qIndex];
  const options = questionEl.querySelectorAll('input[type=radio]');
  const isCorrect = selectedIndex === q.answer;

  questionStatus[qIndex] = isCorrect ? 'correct' : 'incorrect';
  if (isCorrect) liveCorrect++; else liveIncorrect++;
  updateLiveFooter();

  options.forEach(opt => {
    const optIndex = parseInt(opt.value, 10);
    const label = opt.parentElement;
    label.classList.remove('selected-choice', 'correct', 'incorrect');
    if (optIndex === q.answer) label.classList.add('correct-answer');
    if (opt.checked && optIndex === q.answer) {
      label.classList.add('correct');
    } else if (opt.checked && optIndex !== q.answer) {
      label.classList.add('incorrect');
    }
    opt.disabled = true;
  });
}

function updateLiveFooter() {
  const remaining = questions.length - (liveCorrect + liveIncorrect);
  if (liveCorrectElem) liveCorrectElem.textContent = liveCorrect;
  if (liveIncorrectElem) liveIncorrectElem.textContent = liveIncorrect;
  if (liveRemainingElem) liveRemainingElem.textContent = remaining;
}
