let questions = [];
let timer = null;
let timeLeft = 0;
let userAnswers = [];
let subject = null;

const params = new URLSearchParams(window.location.search);
subject = params.get('subject') || '文法';

const elements = {
  startModal: document.getElementById('start-settings-modal'),
  startBtn: document.getElementById('start-test-btn'),
  cancelBtn: document.getElementById('cancel-test-btn'),
  questionCount: document.getElementById('question-count'),
  timeLimit: document.getElementById('time-limit'),
  questionsContainer: document.getElementById('questions-container'),
  timerDisplay: document.getElementById('timer'),
  resultBox: document.getElementById('result'),
  testTitle: document.getElementById('test-title') || document.querySelector('.test-title'),
  stopBtn: document.getElementById('stop_test'),
  backBtn: document.getElementById('back_button'),
  confirmEndModal: document.getElementById('confirm-end-modal'),
  confirmEndYes: document.getElementById('confirm-end-yes'),
  confirmEndNo: document.getElementById('confirm-end-no'),
  confirmExitModal: document.getElementById('confirm-exit-modal'),
  confirmExitYes: document.getElementById('confirm-exit-yes'),
  confirmExitNo: document.getElementById('confirm-exit-no'),
};

const retakeButton = elements.resultBox ? document.createElement('button') : null;
if (retakeButton) {
  retakeButton.id = 'retake-test';
  retakeButton.textContent = 'テストをやり直す';
}

window.addEventListener('load', () => {
  if (elements.startModal) {
    elements.startModal.style.display = 'flex';
  }
  if (elements.testTitle && subject) {
    elements.testTitle.textContent = `日本語テスト： ${subject}`;
  }
  setupThemeToggle();
  bindStartFlow();
  bindConfirmationModals();
  resetViewForNewRun();
});

function setupThemeToggle() {
  const themeButton = document.getElementById('toggle-theme');
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (!themeButton) return;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    themeButton.textContent = '☀️';
  }

  themeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeButton.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

function bindStartFlow() {
  if (elements.startBtn) {
    elements.startBtn.addEventListener('click', () => {
      resetViewForNewRun();
      const count = parseInt(elements.questionCount?.value, 10) || 20;
      const timeMinutes = parseInt(elements.timeLimit?.value, 10) || 60;
      timeLeft = timeMinutes * 60;
      fetch('./json/questions.json')
        .then(res => res.json())
        .then(data => {
          questions = shuffleArray(data[subject] || []).slice(0, count);
          displayQuestions();
          startTimer();
          if (elements.startModal) elements.startModal.style.display = 'none';
        });
    });
  }

  if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (retakeButton) {
    retakeButton.addEventListener('click', () => {
      if (elements.startModal) {
        elements.startModal.style.display = 'flex';
      } else {
        window.location.reload();
      }
      resetViewForNewRun();
    });
  }
}

function bindConfirmationModals() {
  if (elements.stopBtn && elements.confirmEndModal) {
    elements.stopBtn.addEventListener('click', () => {
      elements.confirmEndModal.style.display = 'flex';
    });
  }

  if (elements.confirmEndYes && elements.confirmEndModal) {
    elements.confirmEndYes.addEventListener('click', () => {
      elements.confirmEndModal.style.display = 'none';
      submitTest();
    });
  }

  if (elements.confirmEndNo && elements.confirmEndModal) {
    elements.confirmEndNo.addEventListener('click', () => {
      elements.confirmEndModal.style.display = 'none';
    });
  }

  if (elements.backBtn && elements.confirmExitModal) {
    elements.backBtn.addEventListener('click', () => {
      elements.confirmExitModal.style.display = 'flex';
    });
  }

  if (elements.confirmExitYes) {
    elements.confirmExitYes.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (elements.confirmExitNo && elements.confirmExitModal) {
    elements.confirmExitNo.addEventListener('click', () => {
      elements.confirmExitModal.style.display = 'none';
    });
  }
}

function resetViewForNewRun() {
  clearInterval(timer);
  timer = null;
  userAnswers = [];
  questions = [];

  if (elements.questionsContainer) {
    elements.questionsContainer.innerHTML = '';
  }

  if (elements.resultBox) {
    elements.resultBox.innerHTML = '';
  }

  if (elements.timerDisplay) {
    elements.timerDisplay.textContent = '⏱ --:--';
  }
}

function displayQuestions() {
  if (!elements.questionsContainer) return;
  elements.questionsContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'question';
    let html = `<p><strong>${index + 1}. ${q.question}</strong></p>`;

    if (q.image) {
      html += `<img src="${q.image}" alt="question image"><br>`;
    }

    const options = shuffleArray((q.options || []).map((opt, i) =>
      typeof opt === 'string' ? { text: opt, index: i } : { ...opt, index: i }
    ));

    options.forEach(opt => {
      html += `<label><input type="radio" name="q${index}" value="${opt.index}">`;
      html += opt.image
        ? ` <img src="${opt.image}" alt="option image">`
        : ` ${opt.text}`;
      html += `</label><br>`;
    });

    div.innerHTML = html;
    elements.questionsContainer.appendChild(div);
  });
}

function startTimer() {
  if (!elements.timerDisplay) return;
  elements.timerDisplay.textContent = `⏱ ${formatTime(timeLeft)}`;
  clearInterval(timer);
  timer = setInterval(() => {
    elements.timerDisplay.textContent = `⏱ ${formatTime(timeLeft)}`;
    if (--timeLeft < 0) {
      clearInterval(timer);
      submitTest();
    }
  }, 1000);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.max(0, Math.floor(totalSeconds / 60))).padStart(2, '0');
  const seconds = String(Math.max(0, totalSeconds % 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function submitTest() {
  clearInterval(timer);
  const allQuestions = document.querySelectorAll('.question');
  let correctCount = 0;
  userAnswers = [];

  questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    const selectedIndex = selected ? parseInt(selected.value, 10) : -1;
    userAnswers.push(selectedIndex);

    const options = allQuestions[i]?.querySelectorAll('input[type=radio]') || [];
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

  showResult(correctCount);
}

function showResult(correctCount) {
  if (!elements.resultBox) return;

  const score = document.createElement('div');
  score.className = 'result-box';
  score.innerHTML = `<strong>正解: ${questions.length} 点中 ${correctCount}点</strong><span>もう一度チャレンジしますか？</span>`;

  elements.resultBox.innerHTML = '';
  elements.resultBox.appendChild(score);

  if (retakeButton) {
    elements.resultBox.appendChild(retakeButton);
  }
}
