/* app.js - main application logic for Manuscore */

// frameworkMapping is loaded from framework.js

// DOM references
const loginSection = document.getElementById("loginSection");
const mainNav = document.getElementById("mainNav");
const logoutBtn = document.getElementById("logoutBtn");
const tabs = document.querySelectorAll(".tab-content");
const evaluationForm = document.getElementById("evaluationForm");
const questionContainer = document.getElementById("questionContainer");
const manuscriptTypeSelect = document.getElementById("manuscriptType");
const evalModeSelect = document.getElementById("evalMode");
const recordList = document.getElementById("recordList");

// Document type → frameworks mapping
const docFrameworkMap = {
  "Article": ["CASP", "STROBE", "EQUATOR"],
  "Review": ["PRISMA", "ROBIS", "GRADE"],
  "Conference Paper": ["MMAT", "CASP"],
  "Case Report": ["CARE", "COPE"],
  "Qualitative Study": ["SRQR", "CASP"],
  "Editorial Material": ["COPE"],
  "Letter": ["COPE", "EQUATOR"],
  "Short Survey": ["SCITE", "ALTMETRICS"],
  "Data Paper": ["SEMANTIC", "EQUATOR"],
  "Software Review": ["SEMANTIC", "EQUATOR"],
  "Book Review": ["SCITE", "ALTMETRICS"],
  "Guideline": ["GRADE", "COPE"],
  "Meeting Abstract": ["COPE"]
};

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("manuscoreUser");
  if (user) showApp();
  switchTab('home');
  updateRecordList();
});

// Login (placeholder authentication)
function login(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (username && password) {
    localStorage.setItem("manuscoreUser", username);
    showApp();
    switchTab('home');
  } else {
    alert("Please enter valid credentials.");
  }
}
document.querySelector("#loginSection form").addEventListener("submit", login);

// Logout
function logout() {
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("manuscoreUser");
    hideApp();
    switchTab(null);
  }
}
logoutBtn.addEventListener("click", logout);

// Show/hide UI
function showApp() {
  loginSection.style.display = "none";
  mainNav.style.display = "flex";
  logoutBtn.style.display = "inline-block";
}

function hideApp() {
  loginSection.style.display = "block";
  mainNav.style.display = "none";
  logoutBtn.style.display = "none";
}

// Tab switching
function switchTab(tabId) {
  tabs.forEach(tab => tab.classList.toggle('active', tab.id === tabId));
  if (tabId !== 'evaluate') questionContainer.innerHTML = '';
}
window.switchTab = switchTab;

// Render questions on mode/type change
evalModeSelect.addEventListener("change", renderQuestions);
manuscriptTypeSelect.addEventListener("change", renderQuestions);

function renderQuestions() {
  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  let frameworks = [];

  if (mode === 'full') {
    frameworks = Object.keys(frameworkMapping);
  } else {
    if (!type) {
      questionContainer.innerHTML = '<p>Please select a document type to view questions.</p>';
      return;
    }
    frameworks = docFrameworkMap[type] || [];
  }

  // Aggregate unique question IDs
  const qSet = new Set();
  frameworks.forEach(fw => (frameworkMapping[fw] || []).forEach(id => qSet.add(id)));
  const qids = Array.from(qSet);

  if (!qids.length) {
    questionContainer.innerHTML = '<p>No questions available for the selected criteria.</p>';
    return;
  }

  // Build HTML for each question
  questionContainer.innerHTML = qids.map(id => {
    const text = questions[id] || 'Question text missing';
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

// Form submission handler
evaluationForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!localStorage.getItem("manuscoreUser")) {
    alert("Session expired. Please log in again.");
    return;
  }

  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  if (mode === 'auto' && !type) {
    alert("Please select a document type.");
    return;
  }

  // Collect answers
  const answers = {};
  questionContainer.querySelectorAll('select').forEach(sel => {
    const v = parseInt(sel.value, 10);
    if (!isNaN(v)) answers[sel.id] = v;
  });
  if (!Object.keys(answers).length) {
    alert("Please answer at least one question.");
    return;
  }

  // Determine frameworks for scoring
  const selected = mode === 'full' ? Object.keys(frameworkMapping) : (docFrameworkMap[type] || []);

  // Calculate scores
  const frameworkScores = {};
  selected.forEach(fw => {
    const vals = (frameworkMapping[fw] || []).map(id => answers[id]).filter(v => v != null);
    if (vals.length) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      frameworkScores[fw] = Math.round(avg * 100) / 100;
    }
  });

  // Build record
  const record = {
    id: Date.now(),
    paperTitle: document.getElementById("paperTitle").value.trim(),
    doi: document.getElementById("paperDOI").value.trim(),
    notes: document.getElementById("evaluatorNotes").value.trim(),
    mode,
    documentType: type,
    answers,
    frameworkScores,
    timestamp: new Date().toISOString()
  };

  // Persist and update UI
  const all = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  all.push(record);
  localStorage.setItem("manuscoreRecords", JSON.stringify(all));
  alert(`Saved. Manuscript ID: ${record.id}`);
  updateRecordList();
  switchTab('records');
});

// Update saved records list
function updateRecordList() {
  const data = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  recordList.innerHTML = data.length
    ? data.map((r, i) => `
        <li>
          <strong>#${i+1}</strong>: ${r.paperTitle} (${r.documentType}) <em>[${new Date(r.timestamp).toLocaleDateString()}]</em>
          <button onclick="deleteRecord(${i})">Delete</button>
        </li>
      `).join('')
    : '<li>No records found.</li>';
}

// Delete record
function deleteRecord(idx) {
  const all = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  if (!confirm(`Delete manuscript #${idx+1}?`)) return;
  all.splice(idx, 1);
  localStorage.setItem("manuscoreRecords", JSON.stringify(all));
  updateRecordList();
}
window.deleteRecord = deleteRecord;

// Export CSV
downloadAllCSV = () => {
  const data = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  if (!data.length) return alert("No records to export.");
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(obj => keys.map(k => typeof obj[k]==='object' ? JSON.stringify(obj[k]) : obj[k]).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'manuscore_all_records.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
};
window.downloadAllCSV = downloadAllCSV;

// Citation & BibTeX utilities
copyCitation = () => {
  const text = "Mishra, P. K. & Trenz, O. (2025). Manuscore: A Multi-framework Research Paper Evaluation Tool. Faculty of Business and Economics, Mendel University in Brno.";
  navigator.clipboard.writeText(text).then(() => alert("Citation copied!"));
};
window.copyCitation = copyCitation;

downloadBibtex = () => {
  const bib = `@misc{manuscore2025,\n  author = {Mishra, Pawan Kumar and Trenz, Oldřich},\n  title = {Manuscore: A Multi-framework Research Paper Evaluation Tool},\n  year = {2025},\n  institution = {Faculty of Business and Economics, Mendel University in Brno},\n  note = {Available at https://manuscore.netlify.app}\n}`;
  const blob = new Blob([bib], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'manuscore_citation.bib'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
};
window.downloadBibtex = downloadBibtex;
