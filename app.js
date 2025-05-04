/\* app.js – core logic for Manuscore \*/

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

// State for edit mode
let editingIndex = null;

// Map question IDs to text
const questionMap = {};
if (window\.questions) window\.questions.forEach(q => questionMap\[q.id] = q.text);

// Utility: show/hide login and main app UI
function showApp() {
loginSection.style.display = "none";
mainNav.style.display     = "flex";
logoutBtn.style.display   = "inline-block";
}
function hideApp() {
loginSection.style.display = "block";
mainNav.style.display     = "none";
logoutBtn.style.display   = "none";
clearEdit();
}

// Highlight active nav button
function updateNavActive(tabId) {
document.querySelectorAll('#mainNav button\[data-tab]').forEach(btn => {
btn.classList.toggle('active', btn.dataset.tab === tabId);
});
}

// Show only the selected tab and perform tab-specific actions
function switchTab(tabId) {
tabs.forEach(sec => sec.classList.toggle('active', sec.id === tabId));
updateNavActive(tabId);
if (tabId === 'evaluate') renderQuestions();
if (tabId !== 'evaluate') clearEdit();
}
window\.switchTab = switchTab;

// Reset form for new evaluation
function clearEdit() {
editingIndex = null;
evaluationForm.reset();
evaluationForm.querySelector('button\[type="submit"]').textContent = 'Save Evaluation';
questionContainer.innerHTML = '';
}

// Handle login
loginForm.addEventListener('submit', e => {
e.preventDefault();
const user = document.getElementById('username').value.trim();
const pass = document.getElementById('password').value;
if (user && pass) {
localStorage.setItem('manuscoreUser', user);
showApp();
switchTab('home');
updateRecordList();
} else {
alert('Please enter valid credentials.');
}
});

// Handle logout
logoutBtn.addEventListener('click', () => {
if (confirm('Log out?')) {
localStorage.removeItem('manuscoreUser');
hideApp();
switchTab(null);
}
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
if (localStorage.getItem('manuscoreUser')) showApp();
switchTab('home');
updateRecordList();
// Nav button events
document.querySelectorAll('#mainNav button\[data-tab]').forEach(btn => {
btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
// Evaluate form triggers
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

// Render dynamic questions using framework.js helpers
function renderQuestions() {
const mode = evalModeSelect.value;
const type = manuscriptTypeSelect.value;
let frameworks = \[];
if (mode === 'full') {
frameworks = window\.getFrameworks();
} else {
if (!type) {
questionContainer.innerHTML = '<p>Please select a document type first.</p>';
return;
}
frameworks = window\.docFrameworkMap\[type] || \[];
}
const qids = window\.getQuestionsForFrameworks(frameworks);
if (!qids.length) {
questionContainer.innerHTML = '<p>No questions available for the selected frameworks.</p>';
return;
}
questionContainer.innerHTML = qids.map(id => {
const text = questionMap\[id] || '\[Missing question]';
return `       <div class="question-item">         <label for="${id}">${text}</label>         <select id="${id}" required>           <option value="">–</option>           <option value="1">1</option>           <option value="2">2</option>           <option value="3">3</option>           <option value="4">4</option>           <option value="5">5</option>         </select>       </div>
    `;
}).join('');
// Populate form if editing
if (editingIndex != null) {
const recs = JSON.parse(localStorage.getItem('manuscoreRecords') || '\[]');
const rec = recs\[editingIndex];
document.getElementById('paperTitle').value     = rec.paperTitle;
document.getElementById('paperDOI').value       = rec.doi;
document.getElementById('evaluatorNotes').value = rec.notes;
evalModeSelect.value                            = rec.mode;
manuscriptTypeSelect.value                      = rec.documentType;
qids.forEach(qid => {
const sel = document.getElementById(qid);
if (sel && rec.answers\[qid] != null) sel.value = rec.answers\[qid];
});
evaluationForm.querySelector('button\[type="submit"]').textContent = 'Update Evaluation';
}
}

// Handle save/update
function handleSubmit(e) {
e.preventDefault();
if (!localStorage.getItem('manuscoreUser')) {
alert('Session expired.');
return;
}
const mode = evalModeSelect.value;
const type = manuscriptTypeSelect.value;
if (mode === 'auto' && !type) {
alert('Please select a document type.');
return;
}
// Gather answers
const answers = {};
questionContainer.querySelectorAll('select').forEach(sel => {
const v = parseInt(sel.value, 10);
if (!isNaN(v)) answers\[sel.id] = v;
});
if (!Object.keys(answers).length) {
alert('Answer at least one question.');
return;
}
// Compute scores
const frameworks = mode === 'full' ? window\.getFrameworks() : (window\.docFrameworkMap\[type] || \[]);
const frameworkScores = {};
frameworks.forEach(fw => {
const vals = window\.getQuestionsForFramework(fw)
.map(q => answers\[q]).filter(x => x != null);
if (vals.length) {
const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
frameworkScores\[fw] = Math.round(avg \* 100)/100;
}
});
// Build record
const recsRaw = localStorage.getItem('manuscoreRecords') || '\[]';
const all = JSON.parse(recsRaw);
const record = {
id: editingIndex != null ? all\[editingIndex].id : Date.now(),
paperTitle: document.getElementById('paperTitle').value.trim(),
doi:        document.getElementById('paperDOI').value.trim(),
notes:      document.getElementById('evaluatorNotes').value.trim(),
mode, documentType: type,
answers, frameworkScores,
timestamp: new Date().toISOString()
};
if (editingIndex != null) {
all\[editingIndex] = record;
} else {
all.push(record);
}
localStorage.setItem('manuscoreRecords', JSON.stringify(all));
clearEdit();
updateRecordList();
switchTab('records');
}

// Edit existing record
function editRecord(idx) {
editingIndex = idx;
switchTab('evaluate');
}
window\.editRecord = editRecord;

// Delete record
function deleteRecord(idx) {
const all = JSON.parse(localStorage.getItem('manuscoreRecords') || '\[]');
if (!confirm(`Delete record #${idx+1}?`)) return;
all.splice(idx,1);
localStorage.setItem('manuscoreRecords', JSON.stringify(all));
updateRecordList();
}
window\.deleteRecord = deleteRecord;

// Update records list and overview stats
function updateRecordList() {
const data = JSON.parse(localStorage.getItem('manuscoreRecords') || '\[]');
if (totalCountSpan) totalCountSpan.textContent = data.length;
if (lastEvalDateSpan) lastEvalDateSpan.textContent = data.length
? new Date(data\[data.length-1].timestamp).toLocaleDateString()
: '–';
recordList.innerHTML = data.length
? data.map((r,i)=>`         <li>           <strong>#${i+1}</strong>: ${r.paperTitle} (${r.documentType}) <em>[${new Date(r.timestamp).toLocaleDateString()}]</em>           <button onclick="editRecord(${i})">Edit</button>           <button onclick="deleteRecord(${i})">Delete</button>         </li>
      `).join('')
: '<li>No records found.</li>';
}

// Improved CSV export: flatten answers & frameworkScores into separate columns
function downloadAllCSV() {
const data = JSON.parse(localStorage.getItem('manuscoreRecords') || '\[]');
if (!data.length) return alert('No records to export.');
const qSet = new Set(), fwSet = new Set();
data.forEach(r=>{
Object.keys(r.answers).forEach(q=>qSet.add(q));
Object.keys(r.frameworkScores).forEach(fw=>fwSet.add(fw));
});
const qCols = Array.from(qSet).sort();
const fwCols = Array.from(fwSet).sort();
const headers = \['id','paperTitle','doi','notes','mode','documentType','timestamp',...qCols,...fwCols];
const rows = \[headers];
data.forEach(r=>{
const base = \[r.id,r.paperTitle,r.doi,r.notes,r.mode,r.documentType,r.timestamp];
const qVals = qCols.map(q=>r.answers\[q]||'');
const fwVals = fwCols.map(fw=>r.frameworkScores\[fw]||'');
rows.push(\[...base,...qVals,...fwVals]);
});
const csv = rows.map(row=>row\.map(cell=>`"${(`\${cell}`).replace(/"/g,'""')}"`).join(',')).join('\n');
const blob = new Blob(\[csv],{type:'text/csv'});
const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
a.download='manuscore\_records.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// Utility: copy citation to clipboard
function copyCitation() {
const text = "Mishra, P. K. & Trenz, O. (2025). Manuscore: A Multi-framework Research Paper Evaluation Tool. Faculty of Business and Economics, Mendel University in Brno.";
navigator.clipboard.writeText(text).then(()=>alert('Citation copied!'));
}

// Utility: download BibTeX
function downloadBibtex() {
const bib = `@misc{manuscore2025,\n  author = {Mishra, Pawan Kumar and Trenz, Oldřich},\n  title = {Manuscore: A Multi-framework Research Paper Evaluation Tool},\n  year = {2025},\n  institution = {Faculty of Business and Economics, Mendel University in Brno},\n  note = {Available at https://manuscore.netlify.app}\n}`;
const blob = new Blob(\[bib],{type:'text/plain'});
const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
a.download='manuscore.bib'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
