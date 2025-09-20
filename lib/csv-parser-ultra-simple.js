// lib/csv-parser-ultra-simple.js - Parseur CSV ultra-simple

export function parseUltraSimpleCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  return lines.map(line => {
    const [question, answer] = line.split(',').map(item => item.trim());
    return { question, answer };
  });
}

export function validateUltraSimpleCSV(data) {
  if (!data || data.length === 0) {
    return { isValid: false, errors: ['Aucune donnée trouvée'] };
  }

  const errors = [];
  data.forEach((row, index) => {
    if (!row.question || !row.answer) {
      errors.push(`Ligne ${index + 1}: Question ou réponse manquante`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function convertUltraSimpleCSVToQuizFormat(data, validation) {
  if (!validation.isValid) return null;

  return data.map(row => ({
    question: row.question,
    type: 'ouverte',
    options: [],
    correct_answer: row.answer,
    explanation: '',
    points: 1
  }));
}

export function downloadUltraSimpleTemplate() {
  const template = `Quelle est la capitale de la France ?,Paris
Combien font 2 + 2 ?,4
Quel est le plus grand océan ?,Pacifique`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-quiz-ultra-simple.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadOpenQuestionsTemplate() {
  const template = `Décrivez les principales causes de la Révolution française
Expliquez le principe de la photosynthèse
Analysez l'impact de la révolution numérique sur la société`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-questions-ouvertes.csv';
  a.click();
  URL.revokeObjectURL(url);
}