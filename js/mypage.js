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

let results = loadResults();

renderStats();
renderTable();

document.getElementById('clear-stats')?.addEventListener('click', () => {
  const ok = confirm('Barcha saqlangan natijalar o‘chiriladi. Davom etilsinmi?');
  if (!ok) return;
  localStorage.removeItem('quizResults');
  results = [];
  renderStats();
  renderTable();
});

function loadResults() {
  try {
    const parsed = JSON.parse(localStorage.getItem('quizResults') || '[]');
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0));
    }
    return [];
  } catch {
    return [];
  }
}

function renderStats() {
  const total = results.length;
  const sumAccuracy = results.reduce((acc, r) => acc + (r.accuracy || 0), 0);
  const sumDuration = results.reduce((acc, r) => acc + (r.durationSec || 0), 0);
  const best = results.reduce((max, r) => Math.max(max, r.accuracy || 0), 0);

  setText('stat-total', total);
  setText('stat-avg', `${total ? (sumAccuracy / total).toFixed(1) : '0.0'}%`);
  setText('stat-best', `${best}%`);
  setText('stat-duration', formatDuration(total ? Math.round(sumDuration / total) : 0));

  const subtitle = document.getElementById('subtitle-count');
  if (subtitle) subtitle.textContent = total ? `${total} ta yakunlangan test` : 'Hali natija yo‘q';
}

function renderTable() {
  const container = document.getElementById('table-container');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `<div class="empty-state">Hali natija qo'shilmagan. Testlarni yakunlang va bu yerda ko'rasiz.</div>`;
    return;
  }

  const rows = results.map(r => `
    <tr>
      <td>${formatDate(r.finishedAt)}</td>
      <td>${r.level || '-'}</td>
      <td>${r.subject || '-'}</td>
      <td>${r.correct ?? 0} / ${r.total ?? 0}</td>
      <td>${r.accuracy ?? 0}%</td>
      <td>${formatDuration(r.durationSec || 0)}</td>
      <td>${formatDuration(r.timeLimitSec || 0)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>Vaqt</th>
          <th>Level</th>
          <th>Fan</th>
          <th>Ball</th>
          <th>Accuracy</th>
          <th>Vaqt sarfi</th>
          <th>Limit</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
