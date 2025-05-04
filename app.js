/* app.js – core logic for Manuscore */

// Ensure questions[] and frameworkMapping are loaded
// DOM refs
const loginSection         = document.getElementById("loginSection");
const mainNav              = document.getElementById("mainNav");
const logoutBtn            = document.getElementById("logoutBtn");
const tabs                 = document.querySelectorAll(".tab-content");
const loginForm            = document.getElementById("loginForm");
const evaluationForm       = document.getElementById("evaluationForm");
const questionContainer    = document.getElementById("questionContainer");
const manuscriptTypeSelect = document.getElementById("manuscriptType");
const evalModeSelect       = document.getElementById("evalMode");
const recordList           = document.getElementById("recordList");
const totalCountSpan       = document.getElementById("totalCount");
const lastEvalDateSpan     = document.getElementById("lastEvalDate");

// Build question lookup map
const questionMap = {};
if (typeof questions !== 'undefined') {
  questions.forEach(q => { questionMap[q.id] = q.text; });
} else {
  console.error('questions[] is not defined');
}

// Document type → frameworks mapping
const docFrameworkMap = {
  "Article":           ["CASP","STROBE","EQUATOR"],
  "Review":            ["PRISMA","ROBIS","GRADE"],
  "Conference Paper":  ["MMAT","CASP"],
  "Case Report":       ["CARE","COPE"],
  "Qualitative Study": ["SRQR","CASP"],
  "Editorial Material": ["COPE"],
  "Letter":            ["COPE","EQUATOR"],
  "Short Survey":      ["SCITE","ALTMETRICS"],
  "Data Paper":        ["SEMANTIC","EQUATOR"],
  "Software Review":   ["SEMANTIC","EQUATOR"],
  "Book Review":       ["SCITE","ALTMETRICS"],
  "Guideline":         ["GRADE","COPE"],
  "Meeting Abstract":  ["COPE"]
};

// Show/hide login vs app UI
function showApp() {
  loginSection.style.display = "none";
  mainNav.style.display     = "flex";
  logoutBtn.style.display   = "inline-block";
}
function hideApp() {
  loginSection.style.display = "block";
  mainNav.style.display     = "none";
  logoutBtn.style.display   = "none";
}

// Update navbar active state
function updateNavActive(tabId) {
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
}

// Switch tabs, render questions on evaluate
function switchTab(tabId) {
  tabs.forEach(sec => sec.classList.toggle('active', sec.id === tabId));
  updateNavActive(tabId);
  if (tabId === 'evaluate') {
    renderQuestions();
  }
}
window.switchTab = switchTab;

// Login handler
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (u && p) {
    localStorage.setItem('manuscoreUser', u);
    showApp();
    switchTab('home');
  } else {
    alert('Please enter valid credentials.');
  }
});

// Logout handler
logoutBtn.addEventListener('click', () => {
  if (confirm('Log out?')) {
    localStorage.removeItem('manuscoreUser');
    hideApp();
    switchTab(null);
  }
});

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Check login
  if (localStorage.getItem('manuscoreUser')) showApp();
  switchTab('home');
  updateRecordList();

  // Nav button clicks
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Re-render evaluate if active
  manuscriptTypeSelect.addEventListener('change', () => {
    if (document.getElementById('evaluate').classList.contains('active')) renderQuestions();
  });
  evalModeSelect.addEventListener('change', () => {
    if (document.getElementById('evaluate').classList.contains('active')) renderQuestions();
  });

  // Form submit
  evaluationForm.addEventListener('submit', handleSubmit);

  // Utility buttons
  document.getElementById('copyCitationBtn').addEventListener('click', copyCitation);
  document.getElementById('downloadBibtexBtn').addEventListener('click', downloadBibtex);
  document.getElementById('exportCsvBtn').addEventListener('click', downloadAllCSV);
});

// Render evaluation questions dynamically
function renderQuestions() {
  if (typeof frameworkMapping === 'undefined') {
    console.error('frameworkMapping not defined');
    return;
  }

  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  let frameworks = [];

  if (mode === 'full') {
    frameworks = Object.keys(frameworkMapping);
  } else if (mode === 'auto') {
    if (!type) {
      questionContainer.innerHTML = '<p>Select document type first.</p>';
      return;
    }
    frameworks = docFrameworkMap[type] || [];
  }

  // Collect unique question IDs
  const qids = Array.from(
    new Set(frameworks.flatMap(fw => frameworkMapping[fw] || []))
  );
  if (!qids.length) {
    questionContainer.innerHTML = '<p>No questions available.</p>';
    return;
  }

  // Populate
  questionContainer.innerHTML = qids.map(id => {
    const text = questionMap[id] || '[Missing]';
    return `
      <div class="question-item">
        <label for="${id}">${text}</label>
        <select id="${id}" required>
          <option value="">–</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
    `;
  }).join('');
}

// Handle evaluation submit
function handleSubmit(e) {
  e.preventDefault();
  if (!localStorage.getItem('manuscoreUser')) {
    alert('Session expired.');
    return;
  }

  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  if (mode === 'auto' && !type) {
    alert('Select a document type.');
    return;
  }

  // Gather answers
  const answers = {};
  questionContainer.querySelectorAll('select').forEach(sel => {
    const v = parseInt(sel.value, 10);
    if (!isNaN(v)) answers[sel.id] = v;
  });
  if (!Object.keys(answers).length) {
    alert('Answer at least one question.');
    return;
  }

  // Compute framework scores
  const selectedFws = mode === 'full'
    ? Object.keys(frameworkMapping)
    : (docFrameworkMap[type] || []);
  const frameworkScores = {};
  selectedFws.forEach(fw => {
    const vals = (frameworkMapping[fw] || []).
      map(id => answers[id]).filter(v => v != null);
    if (vals.length) {
      const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
      frameworkScores[fw] = Math.round(avg*100)/100;
    }
  });

  // Build record
  const record = {
    id: Date.now(),
    paperTitle: document.getElementById('paperTitle').value.trim(),
    doi: document.getElementById('paperDOI').value.trim(),
    notes: document.getElementById('evaluatorNotes').value.trim(),
    mode,
    documentType: type,
    answers,
    frameworkScores,
    timestamp: new Date().toISOString()
  };

  // Save and update UI
  const all = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  all.push(record);
  localStorage.setItem('manuscoreRecords', JSON.stringify(all));
  alert(`Saved. ID: ${record.id}`);
  updateRecordList();
  switchTab('records');
}

// Update record list & overview
function updateRecordList() {
  const data = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  // Overview
  if (totalCountSpan) totalCountSpan.textContent = data.length;
  if (lastEvalDateSpan) lastEvalDateSpan.textContent = data.length
    ? new Date(data[data.length-1].timestamp).toLocaleDateString()
    : '–';

  // List
  recordList.innerHTML = data.length
    ? data.map((r,i) => `
        <li>
          <strong>#${i+1}</strong>: ${r.paperTitle} (${r.documentType}) <em>[${new Date(r.timestamp).toLocaleDateString()}]</em>
          <button onclick="deleteRecord(${i})">Delete</button>
        </li>
      `).join('')
    : '<li>No records found.</li>';
}

// Delete record
function deleteRecord(idx) {
  const all = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  if (!confirm(`Delete record #${idx+1}?`)) return;
  all.splice(idx,1);
  localStorage.setItem('manuscoreRecords', JSON.stringify(all));
  updateRecordList();
}
window.deleteRecord = deleteRecord;

// Export CSV
function downloadAllCSV() {
  const data = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  if (!data.length) return alert('No records to export.');
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(o => keys.map(k => typeof o[k]==='object'?JSON.stringify(o[k]):o[k]).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download = 'manuscore_records.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// Citation functions
function copyCitation() {
  const txt = "Mishra, P. K. & Trenz, O. (2025). Manuscore...";
  navigator.clipboard.writeText(txt).then(()=>alert('Copied!'));
}
function downloadBibtex() {
  const bib = `@misc{manuscore2025,...}`;
  const blob = new Blob([bib], {type:'text/plain'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='manuscore.bib'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
