// questions.js - defines evaluation questions and mapping to frameworks

// Array of all possible evaluation questions
const questions = [
  { id: "q1", text: "Are the research objectives clearly stated?" },
  { id: "q2", text: "Is the study design appropriate for the objectives?" },
  { id: "q3", text: "Are key variables well defined?" },
  { id: "q4", text: "Is the sampling method adequately described?" },
  { id: "q5", text: "Is the data collection process clearly explained?" },
  { id: "q6", text: "Are ethical issues addressed (e.g., consent, approval)?" },
  { id: "q7", text: "Is the statistical analysis method appropriate?" },
  { id: "q8", text: "Are limitations of the study acknowledged?" },
  { id: "q9", text: "Is there a clear abstract summarizing key findings?" },
  { id: "q10", text: "Does the title accurately reflect the paper content?" },
  { id: "q11", text: "Are references relevant and current?" },
  { id: "q12", text: "Is the introduction logically structured?" },
  { id: "q13", text: "Are inclusion/exclusion criteria well specified?" },
  { id: "q14", text: "Are results presented clearly and completely?" },
  { id: "q15", text: "Are figures/tables appropriate and labeled?" },
  { id: "q16", text: "Is the discussion linked to existing literature?" },
  { id: "q17", text: "Are conclusions justified by the data?" },
  { id: "q18", text: "Is the methodology reproducible by others?" },
  { id: "q19", text: "Are conflicts of interest disclosed?" },
  { id: "q20", text: "Are funding sources transparently reported?" },
  { id: "q21", text: "Is the review protocol registered (if applicable)?" },
  { id: "q22", text: "Is the search strategy adequately reported?" },
  { id: "q23", text: "Is the selection process for studies transparent?" },
  { id: "q24", text: "Are bias risks assessed systematically?" },
  { id: "q25", text: "Are findings synthesized appropriately?" },
  { id: "q26", text: "Is there evidence of methodological triangulation?" },
  { id: "q27", text: "Are qualitative data analyzed rigorously?" },
  { id: "q28", text: "Is the case context described in detail?" },
  { id: "q29", text: "Are citations critically engaged (not just listed)?" },
  { id: "q30", text: "Is the contribution to theory or practice clear?" },
  { id: "q31", text: "Are altmetric impacts discussed or tracked?" },
  { id: "q32", text: "Are semantic keywords present in abstract and title?" },
  { id: "q33", text: "Are citation contexts (supportive/critical) analyzed?" },
  { id: "q34", text: "Does the paper follow ethical publishing norms?" },
  { id: "q35", text: "Are author contributions clearly stated?" },
  { id: "q36", text: "Are software/data/code publicly accessible?" },
  { id: "q37", text: "Are evaluation tools/frameworks declared?" },
  { id: "q38", text: "Are open peer review processes followed?" },
  { id: "q39", text: "Are methods/tools reusable by others?" },
  { id: "q40", text: "Is the paper suitable for informing policy/practice?" }
];

// Mapping of frameworks to relevant question IDs
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

// Function to render questions based on selected mode/type
function renderQuestions() {
  const container = document.getElementById("questionContainer");
  container.innerHTML = "";
  const mode = document.getElementById("evalMode").value;
  const docType = document.getElementById("manuscriptType").value;

  // Determine frameworks to include
  let selectedFrameworks = [];
  if (mode === "full") {
    selectedFrameworks = Object.keys(frameworkMapping);
  } else { // auto mode
    const docMap = {
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
    selectedFrameworks = docMap[docType] || [];
  }

  // Aggregate unique questions
  const qIDs = [...new Set(selectedFrameworks.flatMap(fw => frameworkMapping[fw]))];
  const toRender = questions.filter(q => qIDs.includes(q.id));

  // Create dropdowns for each question
  toRender.forEach(q => {
    const div = document.createElement("div");
    div.className = "question-item";
    div.innerHTML = `
      <label for="${q.id}">${q.id.toUpperCase()}: ${q.text}</label>
      <select id="${q.id}" name="${q.id}" required>
        <option value="">– Select –</option>
        <option value="1">1 - Poor</option>
        <option value="2">2</option>
        <option value="3">3 - Average</option>
        <option value="4">4</option>
        <option value="5">5 - Excellent</option>
      </select>
    `;
    container.appendChild(div);
  });
}

// Attach change listeners
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("manuscriptType").addEventListener("change", renderQuestions);
  document.getElementById("evalMode").addEventListener("change", renderQuestions);
});
