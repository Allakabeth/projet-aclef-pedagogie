// lib/csv-parser-simple.js - Parseur CSV simple

export function parseSimpleCSV(csvText) {
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

export function validateSimpleCSV(data) {
  if (!data || data.length === 0) {
    return { isValid: false, errors: ['Aucune donnée trouvée'] };
  }

  const errors = [];
  const requiredFields = ['question', 'reponse'];

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

export function convertSimpleCSVToQuizFormat(data, validation) {
  if (!validation.isValid) return null;

  return data.map(row => ({
    question: row.question,
    type: 'qcm',
    options: row.options ? row.options.split(';') : [],
    correct_answer: row.reponse,
    explanation: row.explication || '',
    points: 1
  }));
}

export function downloadSimpleTemplate() {
  const template = `question,reponse,options,explication
"Quelle est la capitale de la France ?",Paris,"Paris;Londres;Berlin;Madrid","Paris est la capitale de la France"
"Quel est le plus grand océan ?",Pacifique,"Pacifique;Atlantique;Indien;Arctique","L'océan Pacifique est le plus grand"`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-quiz-simple.csv';
  a.click();
  URL.revokeObjectURL(url);
}