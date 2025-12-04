const QUESTION_FILE = './json/n2questions.json';
const params = new URLSearchParams(window.location.search);
const subject = params.get('subject') || '文法';

let questions = [];
let questionPool = null;
let timer;
let timeLeft = 3600;
let userAnswers = [];
let lastConfig = { count: 20, time: 60 };

const startModal = document.getElementById('start-settings-modal');
const resultBox = document.getElementById('result');
const answersReview = document.getElementById('answers-review');
const retakeButton = document.getElementById('retake-test');
const postActions = document.getElementById('post-actions');

// 初期設定
window.onload = () => {
  if (startModal) startModal.style.display = 'flex';
  const title = document.getElementById('test-title');
  if (title) title.textContent = `日本語オンラインテスト： ${subject}`;
};

// テーマ切り替え
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

// Начало теста
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

// Вопросы
function displayQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';

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
      html += `<label><input type="radio" name="q${index}" value="${opt.index}">`;
      html += opt.image
        ? ` <img src="${opt.image}" alt="option image" style="max-width: 150px;">`
        : ` ${opt.text}`;
      html += `</label>`;
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

  displayQuestions();
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
}

// Таймер
function startTimer() {
  clearInterval(timer);
  const timerElem = document.getElementById('timer');
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

// Перемешивание
function shuffleArray(arr) {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

const stopBtn = document.getElementById('stop_test');
const backBtn = document.getElementById('back_button');
const cancelBtn = document.getElementById('cancel-test-btn');

if (stopBtn) {
  stopBtn.addEventListener('click', () => {
    document.getElementById('confirm-end-modal').style.display = 'flex';
  });

  document.getElementById('confirm-end-yes').addEventListener('click', () => {
    document.getElementById('confirm-end-modal').style.display = 'none';
    submitTest();
  });

  document.getElementById('confirm-end-no').addEventListener('click', () => {
    document.getElementById('confirm-end-modal').style.display = 'none';
  });
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    document.getElementById('confirm-exit-modal').style.display = 'flex';
  });

  document.getElementById('confirm-exit-yes').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('confirm-exit-no').addEventListener('click', () => {
    document.getElementById('confirm-exit-modal').style.display = 'none';
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// Проверка
function submitTest() {
  clearInterval(timer);
  const allQuestions = document.querySelectorAll('.question');
  let correctCount = 0;
  userAnswers = [];

  questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    const selectedIndex = selected ? parseInt(selected.value, 10) : -1;
    userAnswers.push(selectedIndex);

    const options = allQuestions[i].querySelectorAll('input[type=radio]');
    options.forEach(opt => {
      const optIndex = parseInt(opt.value, 10);
      const label = opt.parentElement;

      if (optIndex === q.answer) label.classList.add('correct-answer');
      if (opt.checked && optIndex === q.answer) {
        correctCount++;
        label.classList.add('correct');
      } else if (opt.checked && optIndex !== q.answer) {
        label.classList.add('incorrect');
      }

      opt.disabled = true;
    });
  });

  const result = document.createElement('div');
  result.className = 'result-summary';
  result.innerHTML = `正解: ${questions.length} 点中 ${correctCount}点`;
  resultBox.innerHTML = '';
  resultBox.appendChild(result);

  renderAnswerReview();
  postActions?.classList.remove('hidden');
}

function renderAnswerReview() {
  answersReview.innerHTML = '';
  questions.forEach((q, index) => {
    const userChoice = userAnswers[index];
    const card = document.createElement('div');
    card.className = 'answer-card';
    const isCorrect = userChoice === q.answer;

    card.innerHTML = `
      <h4>${index + 1}. ${q.question}</h4>
      <p class="answer-meta">正解: ${formatOption(q.options[q.answer])}</p>
      <p class="answer-meta" style="color:${isCorrect ? '#16a34a' : '#ef4444'}">
        あなた: ${userChoice >= 0 ? formatOption(q.options[userChoice]) : '未選択'}
      </p>
    `;

    answersReview.appendChild(card);
  });
}
