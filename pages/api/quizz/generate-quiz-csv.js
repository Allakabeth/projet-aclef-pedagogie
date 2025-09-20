export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    subject,
    level,
    questionCount,
    questionTypes,
    difficulty,
    provider,
    apiKey,
    language = 'fr',
    includeImages = false,
    includeAudio = false,
    customInstructions = ''
  } = req.body;

  // Validation des paramètres
  if (!subject || !level || !apiKey || !provider) {
    return res.status(400).json({ 
      error: 'Paramètres manquants: subject, level, apiKey et provider sont requis' 
    });
  }

  if (questionCount < 1 || questionCount > 50) {
    return res.status(400).json({ 
      error: 'Le nombre de questions doit être entre 1 et 50' 
    });
  }

  try {
    // Construire le prompt pour l'IA
    const prompt = buildAIPrompt({
      subject,
      level,
      questionCount,
      questionTypes,
      difficulty,
      language,
      includeImages,
      includeAudio,
      customInstructions
    });

    let csvContent;

    // Appeler l'IA selon le provider
    switch (provider) {
      case 'openai':
        csvContent = await generateWithOpenAI(prompt, apiKey);
        break;
      case 'claude':
        csvContent = await generateWithClaude(prompt, apiKey);
        break;
      case 'gemini':
        csvContent = await generateWithGemini(prompt, apiKey);
        break;
      default:
        return res.status(400).json({ error: 'Provider non supporté' });
    }

    // Post-traitement si nécessaire
    const processedCSV = await postProcessCSV(csvContent, {
      includeImages,
      includeAudio,
      subject,
      level
    });

    return res.status(200).json({
      csvContent: processedCSV,
      metadata: {
        generatedAt: new Date().toISOString(),
        provider,
        questionCount,
        subject,
        level
      }
    });

  } catch (error) {
    console.error('Erreur génération IA:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la génération: ' + error.message 
    });
  }
}

function buildAIPrompt({
  subject,
  level,
  questionCount,
  questionTypes,
  difficulty,
  language,
  includeImages,
  includeAudio,
  customInstructions
}) {
  const levelDescriptions = {
    'maternelle': 'enfants de 3-6 ans, vocabulaire très simple, concepts de base',
    'cp': 'enfants de 6-7 ans qui apprennent à lire, phrases courtes',
    'ce1': 'enfants de 7-8 ans, lecture confirmée, concepts simples',
    'ce2': 'enfants de 8-9 ans, compréhension développée',
    'cm1': 'enfants de 9-10 ans, raisonnement plus complexe',
    'cm2': 'enfants de 10-11 ans, préparation au collège',
    '6eme': 'collégiens de 11-12 ans, début d\'abstraction',
    '5eme': 'collégiens de 12-13 ans',
    '4eme': 'collégiens de 13-14 ans',
    '3eme': 'collégiens de 14-15 ans, préparation au lycée',
    'lycee': 'lycéens de 15-18 ans, concepts avancés',
    'superieur': 'étudiants du supérieur, niveau universitaire',
    'adulte': 'adultes en formation professionnelle'
  };

  const difficultyDescriptions = {
    'easy': 'questions simples et directes',
    'medium': 'questions de difficulté standard avec quelques défis',
    'hard': 'questions complexes nécessitant réflexion et analyse'
  };

  const typeInstructions = {
    'qcm': 'QCM avec exactement 1 bonne réponse parmi 4 choix',
    'multiple': 'Questions à choix multiples avec 2+ bonnes réponses parmi 4 choix',
    'truefalse': 'Questions Vrai/Faux avec explication',
    'numeric': 'Questions nécessitant une réponse numérique précise',
    'text': 'Questions nécessitant une réponse textuelle courte'
  };

  return `Tu es un expert pédagogique spécialisé dans la création de quiz éducatifs. 

MISSION: Créer un quiz sur "${subject}" pour le niveau "${level}" (${levelDescriptions[level] || level}).

SPÉCIFICATIONS TECHNIQUES:
- Nombre de questions: ${questionCount}
- Difficulté: ${difficulty} (${difficultyDescriptions[difficulty]})
- Types de questions à utiliser: ${questionTypes.map(t => typeInstructions[t]).join(', ')}
- Langue: ${language === 'fr' ? 'Français' : language}

CONTRAINTES PÉDAGOGIQUES:
1. Adapte le vocabulaire et la complexité au niveau "${level}"
2. Crée des questions ${difficultyDescriptions[difficulty]}
3. Inclus des explications pédagogiques détaillées pour chaque question
4. Varie les types de questions demandés
5. Assure-toi que les questions sont pertinentes et éducatives

FORMAT DE SORTIE OBLIGATOIRE:
Tu dois répondre UNIQUEMENT avec du CSV valide selon ce format exact:

quiz_title,quiz_description,quiz_settings,question_type,question_text,question_image,question_audio,answer_1,answer_1_image,answer_1_audio,answer_1_correct,answer_2,answer_2_image,answer_2_audio,answer_2_correct,answer_3,answer_3_image,answer_3_audio,answer_3_correct,answer_4,answer_4_image,answer_4_audio,answer_4_correct,explanation,custom_success_message,custom_error_message,question_settings

RÈGLES CSV IMPORTANTES:
1. Première ligne = titre du quiz, description, paramètres JSON (timeLimit, passingScore, etc.)
2. Lignes suivantes = questions (laisser titre/description vides avec "")  
3. Utilise des guillemets doubles pour encapsuler les textes contenant des virgules
4. Pour les JSON dans les cellules, utilise des guillemets simples ou échappe correctement: {"param": "valeur"} ou {'param': 'valeur'}
5. Types autorisés: ${questionTypes.join(', ')}
6. **IMPORTANT pour QCM**: exactement 1 réponse correcte (answer_X_correct = true) et VARIE la position de la bonne réponse (A, B, C, D)
   - Ne mets PAS toujours la bonne réponse en answer_1
   - Répartis équitablement : parfois answer_1=true, parfois answer_2=true, parfois answer_3=true, parfois answer_4=true
7. Pour multiple: 2+ réponses correctes 
8. Pour truefalse: utilise "Vrai"/"Faux" comme answer_1/answer_2
9. Pour numeric: réponse dans answer_1, tolérance dans question_settings si besoin
10. Pour text: réponse attendue dans answer_1

${includeImages ? 'IMAGES: Suggère des URLs d\'images éducatives pertinentes dans les champs question_image et answer_X_image quand approprié.' : ''}
${includeAudio ? 'AUDIO: Suggère des descriptions audio dans les champs question_audio et answer_X_audio pour l\'accessibilité.' : ''}

EXEMPLE DE STRUCTURE (noter la variation des bonnes réponses):
"Mon Quiz Super","Description du quiz","{'timeLimit': 300, 'passingScore': 60}","qcm","Question 1 ?","","","Mauvaise","","",false,"Bonne réponse","","",true,"Mauvaise","","",false,"Mauvaise","","",false,"Explication","Bravo !","Réessaye !","{'points': 1}"
"","","","qcm","Question 2 ?","","","Mauvaise","","",false,"Mauvaise","","",false,"Mauvaise","","",false,"Bonne réponse","","",true,"Explication","Parfait !","Essaie encore !","{'points': 1}"

${customInstructions ? `\nINSTRUCTIONS SUPPLÉMENTAIRES: ${customInstructions}` : ''}

IMPORTANT: 
- Réponds UNIQUEMENT avec le CSV, aucun texte avant ou après !
- Commence directement par la ligne d'en-têtes CSV
- N'ajoute PAS de marqueurs de code comme \`\`\`csv
- Assure-toi d'avoir AU MOINS la ligne d'en-têtes + ${questionCount} lignes de questions
- Chaque ligne doit contenir exactement 27 colonnes séparées par des virgules

EXEMPLE MINIMAL ATTENDU:
quiz_title,quiz_description,quiz_settings,question_type,question_text,question_image,question_audio,answer_1,answer_1_image,answer_1_audio,answer_1_correct,answer_2,answer_2_image,answer_2_audio,answer_2_correct,answer_3,answer_3_image,answer_3_audio,answer_3_correct,answer_4,answer_4_image,answer_4_audio,answer_4_correct,explanation,custom_success_message,custom_error_message,question_settings
"${subject}","Quiz sur ${subject}","{'timeLimit': 300}","qcm","Question exemple ?","","","Bonne réponse","","",true,"Mauvaise 1","","",false,"Mauvaise 2","","",false,"Mauvaise 3","","",false,"Explication","Bravo !","Réessayez !","{'points': 1}"

ATTENTION: Assure-toi que TOUS les champs sont remplis ou vides ("") - ne laisse JAMAIS de champs manquants qui cassent le CSV !

🎯 DISTRIBUTION ÉQUILIBRÉE OBLIGATOIRE:

Pour ${questionCount} questions, répartis les bonnes réponses de manière ÉQUILIBRÉE sur les 4 positions A, B, C, D.

TARGET: Environ 25% en A, 25% en B, 25% en C, 25% en D

MODÈLE À SUIVRE (cycle A→B→C→D→A→B→C→D...):
Question 1: answer_1=TRUE, answer_2=false, answer_3=false, answer_4=false  (A)
Question 2: answer_1=false, answer_2=TRUE, answer_3=false, answer_4=false  (B)
Question 3: answer_1=false, answer_2=false, answer_3=TRUE, answer_4=false  (C)
Question 4: answer_1=false, answer_2=false, answer_3=false, answer_4=TRUE  (D)
Question 5: answer_1=TRUE, answer_2=false, answer_3=false, answer_4=false  (A)
Question 6: answer_1=false, answer_2=TRUE, answer_3=false, answer_4=false  (B)

⚡ RÈGLE ABSOLUE: Suis le cycle A→B→C→D→A→B→C→D pour garantir l'équilibre parfait !

MAINTENANT, génère le CSV en respectant OBLIGATOIREMENT la variation des positions A/B/C/D :`;
}

async function generateWithOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert pédagogique qui génère uniquement du CSV valide pour des quiz éducatifs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateWithClaude(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

async function generateWithGemini(prompt, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "SYSTÈME: Tu es un générateur de quiz qui ÉQUILIBRE PARFAITEMENT les bonnes réponses. Utilise le cycle A→B→C→D→A→B→C→D pour répartir équitablement sur les 4 positions. Chaque position doit avoir environ 25% des bonnes réponses.\n\n" + prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4000,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

function fixJSONEscaping(csvContent) {
  console.log('🔧 Correction de l\'échappement JSON...');
  console.log('📝 CSV avant correction:', csvContent.substring(0, 200) + '...');
  
  const lines = csvContent.split('\n');
  const fixedLines = lines.map((line, lineIndex) => {
    if (!line.trim()) return line;
    
    // Utiliser parseCSVLine pour bien séparer les colonnes
    const columns = parseCSVLine(line);
    
    // Indices des colonnes JSON dans le CSV standard
    const jsonColumnIndices = [2, 26]; // quiz_settings, question_settings
    
    // Corriger chaque colonne JSON
    const fixedColumns = columns.map((column, colIndex) => {
      // Si c'est une colonne JSON ou si ça ressemble à du JSON
      if (jsonColumnIndices.includes(colIndex) || (column.includes('{') && column.includes('}'))) {
        return fixJSONColumn(column);
      }
      return column;
    });
    
    // Reconstruire la ligne CSV
    return fixedColumns.map(col => {
      if (col === '') return '""';
      
      // Si c'est déjà un JSON échappé correctement, ne pas le re-échapper
      if (col.startsWith('"{') && col.endsWith('}"') && col.includes('""')) {
        return col; // Déjà correctement échappé
      }
      
      if (col.includes(',') || col.includes('"') || col.includes('\n')) {
        return `"${col.replace(/"/g, '""')}"`;
      }
      return col.includes(' ') ? `"${col}"` : col;
    }).join(',');
  });
  
  return fixedLines.join('\n');
}

function fixJSONColumn(column) {
  if (!column || !column.includes('{')) {
    return column;
  }
  
  // Supprimer les guillemets externes s'ils existent
  let jsonStr = column;
  if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
    jsonStr = jsonStr.slice(1, -1);
  }
  
  // Si c'est déjà correctement échappé, le garder
  if (jsonStr.includes('""') && jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
    return `"${jsonStr}"`;
  }
  
  // Dé-échapper d'abord si nécessaire
  jsonStr = jsonStr.replace(/""/g, '"');
  
  // Tenter de parser et re-échapper correctement
  try {
    if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
      const parsed = JSON.parse(jsonStr);
      const reStringified = JSON.stringify(parsed);
      const escaped = reStringified.replace(/"/g, '""');
      console.log(`  ✅ JSON fixé: ${jsonStr} → {""...""}`);
      return `"${escaped}"`;
    }
  } catch (e) {
    console.log(`  ⚠️ JSON non parsable: ${jsonStr}`);
    // Échapper manuellement comme fallback
    const escaped = jsonStr.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return column;
}

function normalizeCSVColumns(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return csvContent;
  
  // Compter les colonnes dans l'en-tête
  const headerLine = lines[0];
  const expectedColumns = headerLine.split(',').length;
  
  console.log(`📊 Normalisation CSV: ${expectedColumns} colonnes attendues`);
  
  const normalizedLines = lines.map((line, index) => {
    if (!line.trim()) return line;
    
    // Parse la ligne CSV en tenant compte des guillemets
    const columns = parseCSVLine(line);
    
    // Ajuster le nombre de colonnes
    while (columns.length < expectedColumns) {
      columns.push('');
    }
    
    // Tronquer si trop de colonnes
    if (columns.length > expectedColumns) {
      columns.splice(expectedColumns);
    }
    
    // Reconstruire la ligne CSV
    const normalizedLine = columns.map(col => {
      if (col === '') return '""';
      if (col.includes(',') || col.includes('"') || col.includes('\n')) {
        return `"${col.replace(/"/g, '""')}"`;
      }
      return col;
    }).join(',');
    
    return normalizedLine;
  });
  
  return normalizedLines.join('\n');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Échappement de guillemet
        current += '"';
        i += 2;
      } else {
        // Début ou fin de guillemets
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Séparateur de colonne
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current);
  return result;
}

function generateBalancedRandomPattern(questionCount) {
  // Créer un array équilibré avec ~25% de chaque position (1,2,3,4)
  const pattern = [];
  const targetPerPosition = Math.floor(questionCount / 4);
  const remainder = questionCount % 4;
  
  // Remplir avec le nombre exact pour chaque position
  for (let pos = 1; pos <= 4; pos++) {
    const count = targetPerPosition + (pos <= remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      pattern.push(pos);
    }
  }
  
  // Mélanger aléatoirement le pattern (Fisher-Yates shuffle)
  for (let i = pattern.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
  }
  
  return pattern;
}

function redistributeCorrectAnswers(csvContent) {
  console.log('🎯 Redistribution équilibrée des bonnes réponses...');
  
  const lines = csvContent.split('\n');
  if (lines.length < 3) return csvContent; // Pas assez de questions
  
  const header = lines[0];
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  if (dataLines.length === 0) return csvContent;
  
  console.log(`   - ${dataLines.length} questions à redistribuer`);
  
  // Génération d'un pattern aléatoire équilibré
  const randomPattern = generateBalancedRandomPattern(dataLines.length);
  console.log(`   - Pattern aléatoire généré: ${randomPattern.map(p => String.fromCharCode(64 + p)).join('')}`);
  
  const redistributedLines = dataLines.map((line, index) => {
    // Utiliser le pattern aléatoire au lieu du cycle fixe
    const targetPosition = randomPattern[index];
    
    // Parser la ligne CSV (méthode simple)
    const parts = line.split(',');
    
    // Indices des colonnes answer_X_correct (attention aux guillemets CSV)
    const correctIndices = [10, 14, 18, 22]; // answer_1, answer_2, answer_3, answer_4
    
    // Réinitialiser toutes les bonnes réponses à false
    correctIndices.forEach((idx, pos) => {
      if (parts[idx]) {
        parts[idx] = 'false';
      }
    });
    
    // Définir la nouvelle bonne réponse selon le cycle
    const newCorrectIndex = correctIndices[targetPosition - 1];
    if (parts[newCorrectIndex] !== undefined) {
      parts[newCorrectIndex] = 'true';
    }
    
    console.log(`   Q${index + 1}: Position ${String.fromCharCode(64 + targetPosition)} (answer_${targetPosition})`);
    
    return parts.join(',');
  });
  
  const result = [header, ...redistributedLines].join('\n');
  console.log('✅ Redistribution terminée - distribution équilibrée appliquée');
  
  return result;
}

function fixCSVStructure(csvContent) {
  console.log('🔧 Simple CSV structure fix...');
  let fixed = csvContent;
  
  // Fix double-escaped JSON in CSV cells: 
  // Pattern: "{""key"": ""value""}" should become "{\"key\": \"value\"}"
  fixed = fixed.replace(/"\{""([^}]*)""\}"/g, (match, content) => {
    // Un-escape the inner JSON quotes
    const unescaped = content.replace(/""/g, '"');
    // Re-wrap in CSV quotes with properly escaped JSON
    return '"{' + unescaped + '}"';
  });
  
  console.log('✅ CSV JSON structure fixed');
  return fixed;
}

async function postProcessCSV(csvContent, options) {
  // Nettoyer le CSV généré plus rigoureusement
  let processed = csvContent
    .replace(/^```csv\n?/gm, '') // Supprimer les marqueurs de code
    .replace(/\n?```$/gm, '')
    .replace(/^```\n?/gm, '') // Supprimer autres marqueurs
    .replace(/\n?```$/gm, '')
    .trim();

  // Supprimer les lignes vides multiples
  processed = processed.replace(/\n\s*\n/g, '\n');
  
  // Vérifier qu'on a au moins un header et une ligne de données
  const lines = processed.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error(`CSV généré invalide: seulement ${lines.length} ligne(s) trouvée(s). Contenu: ${processed.substring(0, 200)}...`);
  }
  
  // Vérifier que la première ligne contient les headers attendus
  const firstLine = lines[0];
  if (!firstLine.includes('quiz_title') || !firstLine.includes('question_text')) {
    console.log('⚠️ Headers CSV non standard détectés, tentative de correction...');
    
    // Si la première ligne ressemble à des données et pas des headers, ajouter les headers
    if (!firstLine.includes('quiz_title')) {
      const standardHeaders = 'quiz_title,quiz_description,quiz_settings,question_type,question_text,question_image,question_audio,answer_1,answer_1_image,answer_1_audio,answer_1_correct,answer_2,answer_2_image,answer_2_audio,answer_2_correct,answer_3,answer_3_image,answer_3_audio,answer_3_correct,answer_4,answer_4_image,answer_4_audio,answer_4_correct,explanation,custom_success_message,custom_error_message,question_settings';
      processed = standardHeaders + '\n' + processed;
    }
  }

  // Redistribuer les bonnes réponses de manière équilibrée
  processed = redistributeCorrectAnswers(processed);
  
  console.log(`✅ CSV post-processé: ${processed.split('\n').length} lignes`);

  // TODO: Ajouter ici la logique pour :
  // - Générer des images via DALL-E ou recherche d'images si includeImages = true
  // - Générer des fichiers audio via TTS si includeAudio = true
  // - Uploader sur Cloudinary et remplacer les URLs

  return processed;
}