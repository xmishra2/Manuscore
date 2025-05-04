
// Framework definitions
const frameworkMapping = {
  CONSORT: ["q1", "q2", "q4", "q5", "q7", "q14", "q17", "q18"],
  PRISMA: ["q1", "q21", "q22", "q23", "q25", "q24"],
  STROBE: ["q1", "q3", "q4", "q7", "q8", "q13"],
  CARE: ["q1", "q5", "q28", "q14", "q17"],
  SRQR: ["q1", "q26", "q27", "q14", "q30"],
  SQUIRE: ["q1", "q2", "q30", "q17", "q40"],
  GRADE: ["q8", "q17", "q24", "q25"],
  CASP: ["q1", "q2", "q3", "q5", "q8", "q14", "q17"],
  MMAT: ["q1", "q2", "q3", "q14", "q26"],
  ROBIS: ["q23", "q24", "q25"],
  EQUATOR: ["q1", "q2", "q6", "q18", "q34"],
  COPE: ["q6", "q19", "q20", "q34", "q35"],
  SCITE: ["q29", "q33"],
  ALTMETRICS: ["q31", "q40"],
  SEMANTIC: ["q10", "q32", "q36"]
};

window.onload = function () {
  const logged = localStorage.getItem("manuscoreUser");
  if (logged) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainNav").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "inline-block";
    document.getElementById("home").classList.add("active");
  }
  updateRecordList();
};

document.getElementById("evaluationForm").addEventListener("submit", function (e) {
  e.preventDefault();

  try {
    const mode = document.getElementById("evalMode").value;
    const docType = document.getElementById("manuscriptType")?.value || "";

    if (mode === "auto" && !docType) {
      alert("Please select a document type.");
      return;
    }

    const answers = {};
    document.querySelectorAll("#questionContainer select").forEach(sel => {
      const val = parseInt(sel.value);
      if (!isNaN(val)) answers[sel.id] = val;
    });

    let selectedFrameworks = [];
    if (mode === "full") {
      selectedFrameworks = Object.keys(frameworkMapping);
    } else {
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
      selectedFrameworks = docFrameworkMap[docType] || [];
    }

    const frameworkScores = {};
    for (const fw of selectedFrameworks) {
      const qids = frameworkMapping[fw];
      const scores = qids.map(id => answers[id]).filter(v => !isNaN(v));
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        frameworkScores[fw] = Math.round(avg * 100) / 100;
      }
    }

    const payload = {
      id: Date.now(),
      paperTitle: document.getElementById("paperTitle").value.trim(),
      doi: document.getElementById("paperDOI").value.trim(),
      notes: document.getElementById("evaluatorNotes").value.trim(),
      mode,
      documentType: docType,
      answers,
      frameworkScores,
      timestamp: new Date().toISOString()
    };

    const all = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
    all.push(payload);
    localStorage.setItem("manuscoreRecords", JSON.stringify(all));
    alert("Saved. Manuscript ID: " + payload.id);
    updateRecordList();
    switchTab("records");

  } catch (err) {
    console.error("Submission error:", err);
    alert("Something went wrong. Please try again.");
  }
});

function updateRecordList() {
  const list = document.getElementById("recordList");
  if (!list) return;
  const data = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  list.innerHTML = "";
  data.forEach((rec, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>#${idx + 1}</strong>: ${rec.paperTitle} (${rec.documentType}) 
      [${new Date(rec.timestamp).toLocaleDateString()}]
      <button onclick="deleteRecord(${idx})" style="margin-left:10px;">Delete</button>
    `;
    list.appendChild(li);
  });
}

function deleteRecord(index) {
  const all = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  if (!confirm("Delete manuscript #" + (index + 1) + "?")) return;
  all.splice(index, 1);
  localStorage.setItem("manuscoreRecords", JSON.stringify(all));
  updateRecordList();
}

function downloadAllCSV() {
  const data = JSON.parse(localStorage.getItem("manuscoreRecords") || "[]");
  if (data.length === 0) return alert("No records to export.");
  const keys = Object.keys(data[0]);
  const rows = [keys];
  data.forEach(obj => {
    rows.push(keys.map(k => typeof obj[k] === "object" ? JSON.stringify(obj[k]) : obj[k]));
  });
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "manuscore_all_records.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function copyCitation() {
  const text = "Mishra, P. K. & Trenz, O. (2025). Manuscore: A Multi-framework Research Paper Evaluation Tool. Faculty of Business and Economics, Mendel University in Brno.";
  navigator.clipboard.writeText(text).then(() => alert("Citation copied to clipboard!"));
}

function downloadBibtex() {
  const bib = `@misc{manuscore2025,
  author = {Mishra, Pawan Kumar and Trenz, Oldřich},
  title = {Manuscore: A Multi-framework Research Paper Evaluation Tool},
  year = {2025},
  institution = {Faculty of Business and Economics, Mendel University in Brno},
  note = {Available at https://manuscore.netlify.app}
}`;
  const blob = new Blob([bib], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "manuscore_citation.bib";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
