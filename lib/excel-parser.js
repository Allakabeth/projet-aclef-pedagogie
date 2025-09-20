// lib/excel-parser.js - Parseur Excel (simulation pour le build)

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    // Simulation d'un parseur Excel pour éviter l'erreur de build
    // En production, il faudrait utiliser une vraie librairie comme xlsx
    reject(new Error('Parseur Excel non implémenté - utilisez CSV'));
  });
}

export function validateExcelData(data) {
  return { isValid: false, errors: ['Format Excel non supporté actuellement'] };
}

export function convertExcelToQuizFormat(data, validation) {
  return null;
}

export function downloadExcelTemplate() {
  alert('Template Excel non disponible - utilisez CSV');
}

export function downloadExcelOpenQuestionsTemplate() {
  alert('Template Excel non disponible - utilisez CSV');
}

export function downloadExcelSimpleTemplate() {
  alert('Template Excel non disponible - utilisez CSV');
}

export function downloadExcelAdvancedTemplate() {
  alert('Template Excel non disponible - utilisez CSV');
}