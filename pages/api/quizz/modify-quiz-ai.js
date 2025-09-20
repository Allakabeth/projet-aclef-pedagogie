// Fonction pour générer un pattern équilibré et aléatoire
function generateBalancedRandomPattern(questionCount) {
  const pattern = [];
  const targetPerPosition = Math.floor(questionCount / 4);
  const remainder = questionCount % 4;
  
  // Remplir le pattern équilibré
  for (let pos = 1; pos <= 4; pos++) {
    const count = targetPerPosition + (pos <= remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      pattern.push(pos);
    }
  }
  
  // Mélange Fisher-Yates pour randomiser
  for (let i = pattern.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
  }
  
  return pattern;
}

// Fonction pour redistribuer équitablement les bonnes réponses
function redistributeCorrectAnswers(csvContent) {
  const lines = csvContent.split('\n');
  if (lines.length <= 1) return csvContent;
  
  const header = lines[0];
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  if (dataLines.length === 0) return csvContent;
  
  // Générer pattern aléatoire équilibré
  const randomPattern = generateBalancedRandomPattern(dataLines.length);
  console.log(`🎯 Redistribution équilibrée des bonnes réponses...`);
  console.log(`   - ${dataLines.length} questions à redistribuer`);
  console.log(`   - Pattern aléatoire généré: ${randomPattern.map(p => 'ABCD'[p-1]).join('')}`);
  
  const redistributedLines = dataLines.map((line, index) => {
    const targetPosition = randomPattern[index]; // 1, 2, 3, ou 4
    const cells = parseCSVLine(line);
    
    if (cells.length < 23) {
      console.log(`⚠️  Ligne ${index + 1} ignorée: ${cells.length} colonnes (minimum 23 requis)`);
      return line; // Skip malformed lines
    }
    
    // Trouver la position actuelle de la bonne réponse
    let currentCorrectPos = -1;
    for (let i = 1; i <= 4; i++) {
      const correctIndex = 7 + (i-1) * 3 + 2; // answer_X_correct index
      if (cells[correctIndex] === 'true' || cells[correctIndex] === true || cells[correctIndex] === 'TRUE') {
        currentCorrectPos = i;
        break;
      }
    }
    
    console.log(`   Q${index + 1}: Actuelle=${currentCorrectPos > 0 ? String.fromCharCode(64 + currentCorrectPos) : 'NONE'}, Cible=${String.fromCharCode(64 + targetPosition)}`);
    
    if (currentCorrectPos === -1) {
      console.log(`   Q${index + 1}: ⚠️  Pas de bonne réponse trouvée`);
      return line; // Pas de bonne réponse trouvée
    }
    
    if (currentCorrectPos === targetPosition) {
      console.log(`   Q${index + 1}: ✅ Déjà à la bonne position`);
      return line; // Déjà à la bonne position
    }
    
    // Échanger les réponses
    const currentAnswerIndex = 7 + (currentCorrectPos-1) * 3; // answer_X
    const currentImageIndex = 7 + (currentCorrectPos-1) * 3 + 1; // answer_X_image  
    const currentCorrectIndex = 7 + (currentCorrectPos-1) * 3 + 2; // answer_X_correct
    
    const targetAnswerIndex = 7 + (targetPosition-1) * 3;
    const targetImageIndex = 7 + (targetPosition-1) * 3 + 1;
    const targetCorrectIndex = 7 + (targetPosition-1) * 3 + 2;
    
    // Échanger texte, image et statut correct
    [cells[currentAnswerIndex], cells[targetAnswerIndex]] = [cells[targetAnswerIndex], cells[currentAnswerIndex]];
    [cells[currentImageIndex], cells[targetImageIndex]] = [cells[targetImageIndex], cells[currentImageIndex]];
    [cells[currentCorrectIndex], cells[targetCorrectIndex]] = [cells[targetCorrectIndex], cells[currentCorrectIndex]];
    
    console.log(`   Q${index + 1}: Position ${String.fromCharCode(64 + targetPosition)} (answer_${targetPosition})`);
    
    return cells.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',');
  });
  
  console.log('✅ Redistribution terminée - distribution équilibrée appliquée');
  
  return [header, ...redistributedLines].join('\n');
}

// Parser une ligne CSV (fonction utilitaire)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i - 1] === ',')) {
      inQuotes = true;
    } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      let field = current.trim();
      if (field.startsWith('"') && field.endsWith('"')) {
        field = field.slice(1, -1);
      }
      result.push(field);
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  
  let field = current.trim();
  if (field.startsWith('"') && field.endsWith('"')) {
    field = field.slice(1, -1);
  }
  result.push(field);
  
  return result;
}

// API pour modifier un quiz existant avec l'IA
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { 
      existingQuiz, 
      modificationRequest, 
      provider = 'gemini', 
      apiKey 
    } = req.body;

    if (!existingQuiz || !modificationRequest) {
      return res.status(400).json({ 
        error: 'Quiz existant et demande de modification requis' 
      });
    }

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Clé API requise pour la modification' 
      });
    }

    console.log('🔄 Modification IA demandée:', modificationRequest);

    // Construire le prompt de modification
    const modificationPrompt = `
Tu es un expert pédagogique. Je vais te donner un quiz existant et une demande de modification spécifique.

QUIZ EXISTANT:
Titre: ${existingQuiz.title}
Description: ${existingQuiz.description}

Questions actuelles:
${existingQuiz.questions.map((q, index) => `
Question ${index + 1}: ${q.text}
Type: ${q.type}
${q.answers ? q.answers.map((a, i) => `  ${String.fromCharCode(65 + i)}) ${a.text} ${a.correct ? '(CORRECT)' : ''}`).join('\n') : ''}
${q.correctAnswer ? `Réponse correcte: ${q.correctAnswer}` : ''}
${q.explanation ? `Explication: ${q.explanation}` : ''}
`).join('\n')}

DEMANDE DE MODIFICATION:
${modificationRequest}

INSTRUCTIONS:
1. Applique UNIQUEMENT la modification demandée
2. Garde tout le reste identique (structure, autres questions, titre, description, etc.)
3. Maintiens la cohérence pédagogique
4. Génère le quiz complet modifié au format CSV avancé
5. Assure-toi que chaque question ait exactement UNE bonne réponse et 2-3 mauvaises
6. Utilise des explications claires pour justifier les réponses
7. IMPORTANT: Remplis TOUTES les colonnes requises, même avec des valeurs vides ""

EXEMPLE DE FORMAT CSV ATTENDU (RESPECTE EXACTEMENT CET ORDRE):
quiz_title,quiz_description,quiz_settings,question_type,question_text,question_image,question_audio,answer_1,answer_1_image,answer_1_audio,answer_1_correct,answer_2,answer_2_image,answer_2_audio,answer_2_correct,answer_3,answer_3_image,answer_3_audio,answer_3_correct,answer_4,answer_4_image,answer_4_audio,answer_4_correct,explanation,custom_success_message,custom_error_message,question_settings
"Quiz Modifié","Description","{'timeLimit':300}","qcm","Question 1?","","","Réponse A","","","true","Réponse B","","","false","Réponse C","","","false","Réponse D","","","false","Explication...","","",""

ATTENTION CRITIQUE:
- Il DOIT y avoir exactement 27 colonnes par ligne (comptez bien!)
- answer_1_correct, answer_2_correct, etc. doivent contenir "true" ou "false" seulement
- N'omettez AUCUNE colonne, même si elle est vide (utilisez "")
- Les colonnes d'image et audio doivent rester vides mais présentes

RÈGLES IMPORTANTES:
- Mets des guillemets autour des valeurs qui contiennent des virgules ou des espaces
- Utilise true/false pour les colonnes answer_X_correct  
- Laisse vide "" pour les colonnes non utilisées (images, audio, etc.)
- Assure-toi que chaque ligne ait exactement 27 colonnes

Réponds UNIQUEMENT avec le CSV, sans texte avant ou après.`;

    let response, data;

    if (provider === 'gemini') {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: modificationPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
          systemInstruction: {
            parts: [{
              text: `Tu es un assistant pédagogique expert spécialisé dans la modification de quiz éducatifs. 
              Tu dois suivre exactement les instructions de modification tout en préservant la qualité pédagogique.
              Réponds toujours uniquement avec du CSV valide, sans aucun texte d'introduction ou de conclusion.`
            }]
          }
        })
      });

      data = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur API Gemini:', data);
        throw new Error(data.error?.message || 'Erreur API Gemini');
      }

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('❌ Réponse Gemini invalide:', data);
        throw new Error('Réponse IA invalide');
      }

      let csvContent = data.candidates[0].content.parts[0].text.trim();
      
      // Nettoyer le CSV (enlever les marqueurs markdown si présents)
      csvContent = csvContent.replace(/```csv\n?/g, '').replace(/```\n?/g, '');
      
      // Vérifier que c'est bien du CSV
      if (!csvContent.includes('quiz_title') || !csvContent.includes(',')) {
        console.error('❌ Format CSV invalide:', csvContent.substring(0, 200));
        throw new Error('L\'IA n\'a pas généré un CSV valide');
      }

      // Appliquer la redistribution automatique des bonnes réponses (comme pour la génération)
      csvContent = redistributeCorrectAnswers(csvContent);

      console.log('✅ Modification IA terminée avec redistribution');
      
      res.status(200).json({ 
        csvContent,
        modificationApplied: modificationRequest
      });

    } else {
      return res.status(400).json({ 
        error: 'Seul le provider Gemini est supporté pour la modification' 
      });
    }

  } catch (error) {
    console.error('❌ Erreur modification IA:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification: ' + error.message 
    });
  }
}