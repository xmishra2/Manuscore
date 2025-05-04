document.getElementById("evaluationForm").addEventListener("submit", function (e) {
  e.preventDefault(); // prevent reload

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

    const selectedFrameworks = mode === "full"
      ? Object.keys(frameworkMapping)
      : {
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
        }[docType] || [];

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
