/* app.js – core logic */

const loginSection        = document.getElementById("loginSection");
const mainNav             = document.getElementById("mainNav");
const logoutBtn           = document.getElementById("logoutBtn");
const tabs                = document.querySelectorAll(".tab-content");
const loginForm           = document.getElementById("loginForm");
const evaluationForm      = document.getElementById("evaluationForm");
const questionContainer   = document.getElementById("questionContainer");
const manuscriptTypeSelect= document.getElementById("manuscriptType");
const evalModeSelect      = document.getElementById("evalMode");
const recordList          = document.getElementById("recordList");

// Show/hide login vs. app
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

// Active tab UI
function updateNavActive(tab) {
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn =>
    btn.classList.toggle("active", btn.dataset.tab === tab)
  );
}
function switchTab(tabId) {
  tabs.forEach(sec => sec.classList.toggle("active", sec.id === tabId));
  if (tabId !== "evaluate") questionContainer.innerHTML = "";
  updateNavActive(tabId);
}
window.switchTab = switchTab;

// Login & logout
loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  if (u && p) {
    localStorage.setItem("manuscoreUser", u);
    showApp();
    switchTab("home");
  } else alert("Enter valid credentials.");
});
logoutBtn.addEventListener("click", () => {
  if (confirm("Log out?")) {
    localStorage.removeItem("manuscoreUser");
    hideApp();
    switchTab(null);
  }
});

// On load
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("manuscoreUser")) showApp();
  switchTab("home");
  updateRecordList();

  // Nav wiring
  document.querySelectorAll('#mainNav button[data-tab]').forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );

  // Hook up evaluation UI
  manuscriptTypeSelect.addEventListener("change", renderQuestions);
  evalModeSelect.addEventListener("change", renderQuestions);
  evaluationForm.addEventListener("submit", handleSubmit);

  // Utilities
  document.getElementById("copyCitationBtn").addEventListener("click", copyCitation);
  document.getElementById("downloadBibtexBtn").addEventListener("click", downloadBibtex);
  document.getElementById("exportCsvBtn").addEventListener("click", downloadAllCSV);
});

// Render questions based on mode + type
function renderQuestions() {
  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  let frameworks = [];

  if (mode === "full") {
    frameworks = Object.keys(frameworkMapping);
  } else if (type) {
    frameworks = ({
      Article:           ["CASP","STROBE","EQUATOR"],
      Review:            ["PRISMA","ROBIS","GRADE"],
      "Conference Paper":["MMAT","CASP"],
      "Case Report":     ["CARE","COPE"],
      "Qualitative Study":["SRQR","CASP"],
      "Editorial Material":["COPE"],
      Letter:            ["COPE","EQUATOR"],
      "Short Survey":    ["SCITE","ALTMETRICS"],
      "Data Paper":      ["SEMANTIC","EQUATOR"],
      "Software Review": ["SEMANTIC","EQUATOR"],
      "Book Review":     ["SCITE","ALTMETRICS"],
      Guideline:         ["GRADE","COPE"],
      "Meeting Abstract":["COPE"]
    })[type] || [];
  } else {
    questionContainer.innerHTML = "<p>Select a document type first.</p>";
    return;
  }

  const qids = [...new Set(frameworks.flatMap(fw => frameworkMapping[fw] || []))];
  if (!qids.length) {
    questionContainer.innerHTML = "<p>No questions available.</p>";
    return;
  }

  questionContainer.innerHTML = qids.map(id => {
    const txt = (questions.find(q => q.id===id)||{}).text || "[Missing]";
    return `
      <div class="question-item">
        <label for="${id}">${txt}</label>
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
  }).join("");
}

// Submit handler
function handleSubmit(e) {
  e.preventDefault();
  if (!localStorage.getItem("manuscoreUser")) {
    return alert("Session expired.");
  }
  const mode = evalModeSelect.value;
  const type = manuscriptTypeSelect.value;
  if (mode==="auto" && !type) {
    return alert("Select a document type.");
  }

  // Gather answers
  const answers = {};
  questionContainer.querySelectorAll("select").forEach(sel=>{
    const v=parseInt(sel.value,10);
    if (!isNaN(v)) answers[sel.id]=v;
  });
  if (!Object.keys(answers).length) {
    return alert("Answer at least one question.");
  }

  // Score frameworks
  const selected = mode==="full"
    ? Object.keys(frameworkMapping)
    : (docFrameworkMap[type]||[]);
  const frameworkScores = {};
  selected.forEach(fw=>{
    const vals = (frameworkMapping[fw]||[]).map(id=>answers[id]).filter(v=>v!=null);
    if (vals.length) {
      const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
      frameworkScores[fw] = Math.round(avg*100)/100;
    }
  });

  // Build record
  const rec = {
    id: Date.now(),
    paperTitle: document.getElementById("paperTitle").value.trim(),
    doi:        document.getElementById("paperDOI").value.trim(),
    notes:      document.getElementById("evaluatorNotes").value.trim(),
    mode, documentType: type,
    answers, frameworkScores,
    timestamp: new Date().toISOString()
  };
  const all = JSON.parse(localStorage.getItem("manuscoreRecords")||"[]");
  all.push(rec);
  localStorage.setItem("manuscoreRecords", JSON.stringify(all));
  alert(`Saved. ID: ${rec.id}`);
  updateRecordList();
  switchTab("records");
}

// Records list
function updateRecordList() {
  const data = JSON.parse(localStorage.getItem("manuscoreRecords")||"[]");
  recordList.innerHTML = data.length 
    ? data.map((r,i)=>`
      <li>
        <strong>#${i+1}</strong>: ${r.paperTitle} (${r.documentType})
        <em>[${new Date(r.timestamp).toLocaleDateString()}]</em>
        <button onclick="deleteRecord(${i})">Delete</button>
      </li>
    `).join("")
    : "<li>No records found.</li>";
}

// Delete
function deleteRecord(i){
  const all=JSON.parse(localStorage.getItem("manuscoreRecords")||"[]");
  if(!confirm(`Delete #${i+1}?`))return;
  all.splice(i,1);
  localStorage.setItem("manuscoreRecords",JSON.stringify(all));
  updateRecordList();
}
window.deleteRecord=deleteRecord;

// CSV export
function downloadAllCSV() {
  const data = JSON.parse(localStorage.getItem("manuscoreRecords")||"[]");
  if(!data.length)return alert("No records to export.");
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(o=>
    keys.map(k=> typeof o[k]==="object"?JSON.stringify(o[k]):o[k]).join(",")
  )].join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="manuscore_records.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Citation
function copyCitation() {
  const txt = "Mishra, P. K. & Trenz, O. (2025). Manuscore: A Multi-framework Research Paper Evaluation Tool. Faculty of Business and Economics, Mendel University in Brno.";
  navigator.clipboard.writeText(txt).then(()=>alert("Copied!"));
}

// BibTeX
function downloadBibtex() {
  const bib = `@misc{manuscore2025,
  author = {Mishra, Pawan Kumar and Trenz, Oldřich},
  title = {Manuscore: A Multi-framework Research Paper Evaluation Tool},
  year = {2025},
  institution = {Faculty of Business and Economics, Mendel University in Brno},
  note = {Available at https://manuscore.netlify.app}
}`;
  const blob=new Blob([bib],{type:"text/plain"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="manuscore.bib";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
