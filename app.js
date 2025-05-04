// app.js – Core logic for Manuscore

// DOM references
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

// Track edit mode
let editingIndex = null;

// Map question IDs to text
const questionMap = {};
if (window.questions) window.questions.forEach(q => questionMap[q.id] = q.text);

// Tab switching
function switchTab(tabId) {
  tabs.forEach(sec => sec.classList.toggle('active', sec.id === tabId));
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabId)
  );
  if (tabId === 'evaluate') renderQuestions();
  if (tabId !== 'evaluate') clearEdit();
}
window.switchTab = switchTab;

// Show/hide login and main app
function showApp() {
  loginSection.style.display = "none";
  mainNav.style.display = "flex";
  logoutBtn.style.display = "inline-block";
}
function hideApp() {
  loginSection.style.display = "block";
  mainNav.style.display = "none";
  logoutBtn.style.display = "none";
  clearEdit();
}

// Login
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (u && p) {
    localStorage.setItem('manuscoreUser', u);
    showApp();
    switchTab('home');
    updateRecordList();
  } else {
    alert('Please enter valid credentials.');
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  if (confirm('Log out?')) {
    localStorage.removeItem('manuscoreUser');
    hideApp();
    switchTab(null);
  }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('manuscoreUser')) showApp();
  switchTab('home');
  updateRecordList();

  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  manuscriptTypeSelect.addEventListener('change', () => {
    if (document.getElementById('evaluate').classList.contains('active')) renderQuestions();
  });

  evalModeSelect.addEventListener('change', () => {
    if (document.getElementById('evaluate').classList.contains('active')) renderQuestions();
  });

  evaluationForm.addEventListener('submit', handleSubmit);

  document.getElementById('copyCitationBtn').addEventListener('click', copyCitation);
  document.getElementById('downloadBibtexBtn').addEventListener('click', downloadBibtex);
  document.getElementById('exportCsvBtn').addEventListener('click', downloadAllCSV);
});

// Render evaluation questions
function renderQuestions() {
  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  let frameworks = [];

  if (mode === 'full') {
    frameworks = getFrameworks();
  } else if (mode === 'auto') {
    if (!type) {
      questionContainer.innerHTML = '<p>Please select a document type first.</p>';
      return;
    }
    frameworks = docFrameworkMap[type] || [];
  }

  const qids = getQuestionsForFrameworks(frameworks);
  if (!qids.length) {
    questionContainer.innerHTML = '<p>No questions available.</p>';
    return;
  }

  questionContainer.innerHTML = qids.map(id => {
    const text = questionMap[id] || '[Missing question]';
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
      </div>`;
  }).join('');

  // Restore values if editing
  if (editingIndex != null) {
    const rec = JSON.parse(localStorage.getItem('manuscoreRecords'))[editingIndex];
    document.getElementById('paperTitle').value = rec.paperTitle;
    document.getElementById('paperDOI').value = rec.doi;
    document.getElementById('evaluatorNotes').value = rec.notes;
    evalModeSelect.value = rec.mode;
    manuscriptTypeSelect.value = rec.documentType;
    Object.entries(rec.answers).forEach(([id, val]) => {
      const sel = document.getElementById(id);
      if (sel) sel.value = val;
    });
    evaluationForm.querySelector('button[type="submit"]').textContent = 'Update Evaluation';
  }
}

// Submit handler
function handleSubmit(e) {
  e.preventDefault();
  if (!localStorage.getItem('manuscoreUser')) return alert('Session expired.');

  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  if (mode === 'auto' && !type) return alert('Select a document type.');

  const answers = {};
  questionContainer.querySelectorAll('select').forEach(sel => {
    const val = parseInt(sel.value);
    if (!isNaN(val)) answers[sel.id] = val;
  });
  if (!Object.keys(answers).length) return alert('Please answer at least one question.');

  const selectedFrameworks = mode === 'full' ? getFrameworks() : (docFrameworkMap[type] || []);
  const frameworkScores = {};
  selectedFrameworks.forEach(fw => {
    const vals = getQuestionsForFramework(fw).map(id => answers[id]).filter(v => v != null);
    if (vals.length) frameworkScores[fw] = Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100;
  });

  const recs = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  const record = {
    id: editingIndex != null ? recs[editingIndex].id : Date.now(),
    paperTitle: document.getElementById('paperTitle').value.trim(),
    doi: document.getElementById('paperDOI').value.trim(),
    notes: document.getElementById('evaluatorNotes').value.trim(),
    mode, documentType: type,
    answers, frameworkScores,
    timestamp: new Date().toISOString()
  };

  if (editingIndex != null) {
    recs[editingIndex] = record;
  } else {
    recs.push(record);
  }

  localStorage.setItem('manuscoreRecords', JSON.stringify(recs));
  updateRecordList();
  switchTab('records');
  clearEdit();
}

// Edit
function editRecord(index) {
  editingIndex = index;
  switchTab('evaluate');
}
window.editRecord = editRecord;

// Delete
function deleteRecord(index) {
  const recs = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  if (!confirm('Delete record #' + (index + 1) + '?')) return;
  recs.splice(index, 1);
  localStorage.setItem('manuscoreRecords', JSON.stringify(recs));
  updateRecordList();
}
window.deleteRecord = deleteRecord;

// Clear form
function clearEdit() {
  editingIndex = null;
  evaluationForm.reset();
  evaluationForm.querySelector('button[type="submit"]').textContent = 'Save Evaluation';
  questionContainer.innerHTML = '';
}

// List records
function updateRecordList() {
  const recs = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  recordList.innerHTML = recs.length
    ? recs.map((r, i) => `
        <li>
          <strong>#${i + 1}</strong>: ${r.paperTitle} (${r.documentType}) 
          <em>[${new Date(r.timestamp).toLocaleDateString()}]</em>
          <button onclick="editRecord(${i})">Edit</button>
          <button onclick="deleteRecord(${i})">Delete</button>
        </li>`).join('')
    : '<li>No records found.</li>';
}

// Export
function downloadAllCSV() {
  const data = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  if (!data.length) return alert('No records to export.');
  const allQ = new Set(), allF = new Set();
  data.forEach(r => {
    Object.keys(r.answers).forEach(k => allQ.add(k));
    Object.keys(r.frameworkScores).forEach(f => allF.add(f));
  });
  const qCols = [...allQ].sort(), fCols = [...allF].sort();
  const headers = ['id','paperTitle','doi','notes','mode','documentType','timestamp',...qCols,...fCols];
  const rows = [headers];
  data.forEach(r => {
    const base = [r.id,r.paperTitle,r.doi,r.notes,r.mode,r.documentType,r.timestamp];
    const qa = qCols.map(k => r.answers[k] || '');
    const fs = fCols.map(k => r.frameworkScores[k] || '');
    rows.push([...base,...qa,...fs]);
  });
  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'manuscore_records.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Citation
function copyCitation() {
  const text = "Mishra, P. K. & Trenz, O. (2025). Manuscore: A Multi-framework Research Paper Evaluation Tool. Faculty of Business and Economics, Mendel University in Brno.";
  navigator.clipboard.writeText(text).then(() => alert("Citation copied!"));
}

function downloadBibtex() {
  const bib = `@misc{manuscore2025,
  author = {Mishra, Pawan Kumar and Trenz, Oldřich},
  title = {Manuscore: A Multi-framework Research Paper Evaluation Tool},
  year = {2025},
  institution = {Faculty of Business and Economics, Mendel University in Brno},
  note = {Available at https://manuscore.netlify.app}
}`;
  const blob = new Blob([bib], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'manuscore.bib';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".accordion-toggle").forEach(button => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;
      panel.style.display = panel.style.display === "block" ? "none" : "block";
    });
  });
});
