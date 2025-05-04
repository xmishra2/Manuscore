// framework.js – Maps frameworks to evaluation question IDs

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

// Optional map for auto-mode based on document type
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

// Utility functions
function getFrameworks() {
  return Object.keys(frameworkMapping);
}

function getQuestionsForFramework(framework) {
  return frameworkMapping[framework] || [];
}

function getQuestionsForFrameworks(frameworks) {
  const all = new Set();
  frameworks.forEach(fw => {
    (frameworkMapping[fw] || []).forEach(q => all.add(q));
  });
  return Array.from(all);
}

// Make available globally
window.frameworkMapping = frameworkMapping;
window.docFrameworkMap = docFrameworkMap;
window.getFrameworks = getFrameworks;
window.getQuestionsForFramework = getQuestionsForFramework;
window.getQuestionsForFrameworks = getQuestionsForFrameworks;
