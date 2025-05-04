/* app.js – core logic for Manuscore */

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
const totalCountSpan       = document.getElementById("totalCount");
const lastEvalDateSpan     = document.getElementById("lastEvalDate");

// Track editing state
let editingIndex = null;

// Build question lookup
const questionMap = {};
questions.forEach(q => questionMap[q.id] = q.text);

// Document Type → Frameworks mapping for Auto mode
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

// Show/hide UI
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

// Update nav active state
function updateNavActive(tabId) {
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
}

// Switch tabs and render Evaluate
function switchTab(tabId) {
  tabs.forEach(sec => sec.classList.toggle('active', sec.id === tabId));
  updateNavActive(tabId);
  if (tabId === 'evaluate') renderQuestions();
  if (tabId === 'home') clearEdit();
}
window.switchTab = switchTab;

// Clear editing state
function clearEdit() {
  editingIndex = null;
  evaluationForm.querySelector('button[type="submit"]').textContent = 'Save Evaluation';
  evaluationForm.reset();
}

// Login handler
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (u && p) {
    localStorage.setItem('manuscoreUser', u);
    showApp();
    switchTab('home');
  } else alert('Please enter valid credentials.');
});

// Logout handler
logoutBtn.addEventListener('click', () => {
  if (confirm('Log out?')) {
    localStorage.removeItem('manuscoreUser');
    hideApp();
    switchTab(null);
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('manuscoreUser')) showApp();
  switchTab('home');
  updateRecordList();

  // Nav clicks
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Evaluate form listeners
  manuscriptTypeSelect.addEventListener('change', () => {
    if (document.getElementById('evaluate').classList.contains('active')) renderQuestions();
  });
  evalModeSelect.addEventListener('change', () => {
    if (document.getElementById('evaluate').classList.contains('active')) renderQuestions();
  });
  evaluationForm.addEventListener('submit', handleSubmit);

  // Utility buttons
  document.getElementById('copyCitationBtn').addEventListener('click', copyCitation);
  document.getElementById('downloadBibtexBtn').addEventListener('click', downloadBibtex);
  document.getElementById('exportCsvBtn').addEventListener('click', downloadAllCSV);
});

// Render questions based on mode/type
function renderQuestions() {
  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  let frameworks = [];
  if (mode === 'full') frameworks = Object.keys(frameworkMapping);
  else if (mode === 'auto') {
    if (!type) {
      questionContainer.innerHTML = '<p>Please select a document type first.</p>';
      return;
    }
    frameworks = docFrameworkMap[type] || [];
  }
  const qids = [...new Set(frameworks.flatMap(fw => frameworkMapping[fw] || []))];
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
      </div>
    `;
  }).join('');

  // If editing, populate answers
  if (editingIndex != null) {
    const rec = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]')[editingIndex];
    document.getElementById('paperTitle').value = rec.paperTitle;
    document.getElementById('paperDOI').value = rec.doi;
    document.getElementById('evaluatorNotes').value = rec.notes;
    evalModeSelect.value = rec.mode;
    manuscriptTypeSelect.value = rec.documentType;
    qids.forEach(id => {
      const sel = document.getElementById(id);
      if (sel && rec.answers[id] != null) sel.value = rec.answers[id];
    });
    evaluationForm.querySelector('button[type="submit"]').textContent = 'Update Evaluation';
  }
}

// Handle form submit for save/update
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
  const answers = {};
  questionContainer.querySelectorAll('select').forEach(sel => {
    const v = parseInt(sel.value, 10);
    if (!isNaN(v)) answers[sel.id] = v;
  });
  if (!Object.keys(answers).length) {
    alert('Answer at least one question.');
    return;
  }
  const selected = mode === 'full' ? Object.keys(frameworkMapping) : (docFrameworkMap[type] || []);
  const frameworkScores = {};
  selected.forEach(fw => {
    const vals = frameworkMapping[fw].map(id => answers[id]).filter(v => v != null);
    if (vals.length) frameworkScores[fw] = Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100;
  });
  const record = {
    id: editingIndex!=null ? JSON.parse(localStorage.getItem('manuscoreRecords'))[editingIndex].id : Date.now(),
    paperTitle: document.getElementById('paperTitle').value.trim(),
    doi: document.getElementById('paperDOI').value.trim(),
    notes: document.getElementById('evaluatorNotes').value.trim(),
    mode, documentType: type, answers, frameworkScores,
    timestamp: new Date().toISOString()
  };
  const all = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  if (editingIndex != null) {
    all[editingIndex] = record;
    editingIndex = null;
  } else {
    all.push(record);
  }
  localStorage.setItem('manuscoreRecords', JSON.stringify(all));
  updateRecordList();
  switchTab('records');
  clearEdit();
}

// Edit an existing record
function editRecord(idx) {
  editingIndex = idx;
  switchTab('evaluate');
}
window.editRecord = editRecord;

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
          <button onclick="editRecord(${i})">Edit</button>
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

// Improved CSV export
function downloadAllCSV() {
  const data = JSON.parse(localStorage.getItem('manuscoreRecords') || '[]');
  if (!data.length) return alert('No records to export.');
  const keys = ['id','paperTitle','doi','notes','mode','documentType','timestamp','answers','frameworkScores'];
  const rows = [keys.join(',')];
  data.forEach(obj => {
    const row = keys.map(k => {
      let v = obj[k];
      if (typeof v === 'object') v = JSON.stringify(v);
      v = `${v}`.replace(/"/g,'""');
      return `"${v}"`;
    });
    rows.push(row.join(','));
  });
  const csv = rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'manuscore_records.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// Citation utils
function copyCitation() {
  const txt = "Mishra, P. K. & Trenz, O. (2025). Manuscore: A Multi-framework Research Paper Evaluation Tool. Faculty of Business and Economics, Mendel University in Brno.";
  navigator.clipboard.writeText(txt).then(()=>alert('Copied!'));
}
function downloadBibtex() {
  const bib = `@misc{manuscore2025,...}`;
  const blob=new Blob([bib],{type:'text/plain'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='manuscore.bib'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
