// lib/csv-parser.js - Parseur CSV avancé

export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

export function validateCSV(data) {
  if (!data || data.length === 0) {
    return { isValid: false, errors: ['Aucune donnée trouvée'] };
  }

  const errors = [];
  const requiredFields = ['question', 'type', 'reponse_correcte'];

  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field]) {
        errors.push(`Ligne ${index + 2}: Champ "${field}" manquant`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function convertCSVToQuizFormat(data, validation) {
  if (!validation.isValid) return null;

  return data.map(row => ({
    question: row.question,
    type: row.type,
    options: row.options ? row.options.split(';') : [],
    correct_answer: row.reponse_correcte,
    explanation: row.explication || '',
    points: parseInt(row.points) || 1
  }));
}

export function downloadTemplate() {
  const template = `question,type,options,reponse_correcte,explication,points
"Quelle est la capitale de la France ?",qcm,"Paris;Londres;Berlin;Madrid",Paris,"Paris est la capitale de la France",1
"2 + 2 = ?",numerique,"",4,"Addition simple",1`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-quiz-avance.csv';
  a.click();
  URL.revokeObjectURL(url);
}