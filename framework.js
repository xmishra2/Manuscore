// framework.js
// Provides mappings of reporting frameworks to evaluation question IDs
// and helper functions for retrieving frameworks and questions.

/\*\*

* Primary mapping: framework name → array of question IDs
  \*/
  const frameworkMapping = {
  CONSORT:   \["q1","q2","q4","q5","q7","q14","q17","q18"],
  PRISMA:    \["q1","q21","q22","q23","q25","q24"],
  STROBE:    \["q1","q3","q4","q7","q8","q13"],
  CARE:      \["q1","q5","q28","q14","q17"],
  SRQR:      \["q1","q26","q27","q14","q30"],
  SQUIRE:    \["q1","q2","q30","q17","q40"],
  GRADE:     \["q8","q17","q24","q25"],
  CASP:      \["q1","q2","q3","q5","q8","q14","q17"],
  MMAT:      \["q1","q2","q3","q14","q26"],
  ROBIS:     \["q23","q24","q25"],
  EQUATOR:   \["q1","q2","q6","q18","q34"],
  COPE:      \["q6","q19","q20","q34","q35"],
  SCITE:     \["q29","q33"],
  ALTMETRICS:\["q31","q40"],
  SEMANTIC:  \["q10","q32","q36"]
  };

/\*\*

* Document-type to frameworks mapping (for auto mode)
  \*/
  const docTypeFrameworks = {
  Article:           \["CASP","STROBE","EQUATOR"],
  Review:            \["PRISMA","ROBIS","GRADE"],
  "Conference Paper": \["MMAT","CASP"],
  "Case Report":    \["CARE","COPE"],
  "Qualitative Study": \["SRQR","CASP"],
  "Editorial Material": \["COPE"],
  Letter:            \["COPE","EQUATOR"],
  "Short Survey":   \["SCITE","ALTMETRICS"],
  "Data Paper":     \["SEMANTIC","EQUATOR"],
  "Software Review": \["SEMANTIC","EQUATOR"],
  "Book Review":    \["SCITE","ALTMETRICS"],
  Guideline:         \["GRADE","COPE"],
  "Meeting Abstract": \["COPE"]
  };

/\*\*

* Get the list of all available frameworks.
* @returns {string\[]}
  \*/
  function getFrameworks() {
  return Object.keys(frameworkMapping);
  }

/\*\*

* Get question IDs for a given framework.
* @param {string} frameworkName
* @returns {string\[]}
  \*/
  function getQuestionsForFramework(frameworkName) {
  return frameworkMapping\[frameworkName] || \[];
  }

/\*\*

* For a set of frameworks, aggregate unique question IDs.
* @param {string\[]} frameworks
* @returns {string\[]}
  \*/
  function getQuestionsForFrameworks(frameworks) {
  const set = new Set();
  frameworks.forEach(fw => {
  (frameworkMapping\[fw] || \[]).forEach(q => set.add(q));
  });
  return Array.from(set);
  }

// Expose globals for app.js
window\.frameworkMapping = frameworkMapping;
window\.docFrameworkMap    = docTypeFrameworks;
window\.getFrameworks      = getFrameworks;
window\.getQuestionsForFramework = getQuestionsForFramework;
window\.getQuestionsForFrameworks = getQuestionsForFrameworks;

