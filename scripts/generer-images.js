/**
 * Script de génération d'images en batch
 * Usage: node scripts/generer-images.js
 *
 * Essaie plusieurs méthodes:
 * 1. OpenRouter avec modèles image (si disponible)
 * 2. Affiche les prompts pour génération manuelle
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Liste des images à générer
const IMAGES_A_GENERER = {
    aliments: [
        { nom: 'pomme', prompt: 'A single red apple, photorealistic, centered on pure white background, product photography, studio lighting, no shadows' },
        { nom: 'banane', prompt: 'A single yellow ripe banana, photorealistic, centered on pure white background, product photography, studio lighting' },
        { nom: 'carotte', prompt: 'A single fresh orange carrot with green leaves, photorealistic, centered on pure white background, product photography' },
        { nom: 'tomate', prompt: 'A single ripe red tomato, photorealistic, centered on pure white background, product photography, studio lighting' },
        { nom: 'salade', prompt: 'A fresh green lettuce, photorealistic, centered on pure white background, product photography' },
        { nom: 'chocolat', prompt: 'A chocolate bar in wrapper partially opened, photorealistic, centered on pure white background, product photography' },
        { nom: 'cafe-paquet', prompt: 'A coffee bag package, photorealistic, centered on pure white background, product photography' },
        { nom: 'riz', prompt: 'A bag of white rice, photorealistic, centered on pure white background, product photography' },
        { nom: 'pates', prompt: 'A package of spaghetti pasta, photorealistic, centered on pure white background, product photography' },
        { nom: 'poisson-entier', prompt: 'A fresh whole fish on a white plate, photorealistic, centered on pure white background, product photography' },
        { nom: 'concombre', prompt: 'A fresh green cucumber, photorealistic, centered on pure white background, product photography' },
        { nom: 'poivron', prompt: 'A red bell pepper, photorealistic, centered on pure white background, product photography' },
        { nom: 'courgette', prompt: 'A green zucchini, photorealistic, centered on pure white background, product photography' },
        { nom: 'oignon', prompt: 'A yellow onion, photorealistic, centered on pure white background, product photography' },
        { nom: 'ail', prompt: 'A garlic bulb, photorealistic, centered on pure white background, product photography' },
        { nom: 'pomme-de-terre', prompt: 'A potato, photorealistic, centered on pure white background, product photography' },
        { nom: 'raisin', prompt: 'A bunch of green grapes, photorealistic, centered on pure white background, product photography' },
        { nom: 'fraise', prompt: 'Fresh strawberries, photorealistic, centered on pure white background, product photography' },
        { nom: 'citron', prompt: 'A yellow lemon, photorealistic, centered on pure white background, product photography' },
        { nom: 'poire', prompt: 'A green pear, photorealistic, centered on pure white background, product photography' },
    ],
    objets: [
        { nom: 'cles', prompt: 'A set of house keys on a keyring, photorealistic, centered on pure white background, product photography' },
        { nom: 'telephone', prompt: 'A modern smartphone, photorealistic, centered on pure white background, product photography' },
        { nom: 'lunettes', prompt: 'A pair of reading glasses, photorealistic, centered on pure white background, product photography' },
        { nom: 'portefeuille', prompt: 'A brown leather wallet, photorealistic, centered on pure white background, product photography' },
        { nom: 'montre', prompt: 'A classic wristwatch, photorealistic, centered on pure white background, product photography' },
        { nom: 'livre', prompt: 'A closed red hardcover book, photorealistic, centered on pure white background, product photography' },
        { nom: 'stylo', prompt: 'A blue ballpoint pen, photorealistic, centered on pure white background, product photography' },
        { nom: 'parapluie', prompt: 'A closed black umbrella, photorealistic, centered on pure white background, product photography' },
        { nom: 'bougie', prompt: 'A white candle, photorealistic, centered on pure white background, product photography' },
        { nom: 'horloge', prompt: 'A round wall clock, photorealistic, centered on pure white background, product photography' },
        { nom: 'lampe', prompt: 'A desk lamp, photorealistic, centered on pure white background, product photography' },
        { nom: 'vase', prompt: 'An empty glass vase, photorealistic, centered on pure white background, product photography' },
        { nom: 'plante', prompt: 'A small green potted plant, photorealistic, centered on pure white background, product photography' },
        { nom: 'reveil', prompt: 'A vintage alarm clock, photorealistic, centered on pure white background, product photography' },
        { nom: 'ciseaux', prompt: 'A pair of scissors, photorealistic, centered on pure white background, product photography' },
        { nom: 'tasse', prompt: 'A white coffee mug, photorealistic, centered on pure white background, product photography' },
        { nom: 'assiette', prompt: 'A white dinner plate, photorealistic, centered on pure white background, product photography' },
        { nom: 'fourchette', prompt: 'A silver fork, photorealistic, centered on pure white background, product photography' },
        { nom: 'couteau', prompt: 'A dinner knife, photorealistic, centered on pure white background, product photography' },
        { nom: 'cuillere', prompt: 'A silver spoon, photorealistic, centered on pure white background, product photography' },
    ]
};

// Vérifier quels modèles sont disponibles sur OpenRouter
async function listerModelesOpenRouter() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'openrouter.ai',
            path: '/api/v1/models',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function verifierModelesImage() {
    console.log('🔍 Recherche de modèles de génération d\'images sur OpenRouter...\n');

    try {
        const result = await listerModelesOpenRouter();

        if (result.data) {
            // Chercher des modèles d'images
            const modelesImage = result.data.filter(m =>
                m.id.includes('dall-e') ||
                m.id.includes('stable-diffusion') ||
                m.id.includes('midjourney') ||
                m.id.includes('imagen') ||
                m.id.includes('sdxl') ||
                m.id.includes('flux') ||
                (m.architecture && m.architecture.includes('image'))
            );

            if (modelesImage.length > 0) {
                console.log('✅ Modèles de génération d\'images trouvés:');
                modelesImage.forEach(m => {
                    console.log(`   - ${m.id} (${m.pricing?.prompt || '?'}/token)`);
                });
                return modelesImage;
            } else {
                console.log('❌ Aucun modèle de génération d\'images disponible sur OpenRouter');
                console.log('   Les modèles disponibles sont principalement des LLMs texte.\n');
            }
        }
    } catch (error) {
        console.log('❌ Erreur lors de la vérification:', error.message);
    }

    return [];
}

function afficherPromptsPourGemini() {
    console.log('\n' + '='.repeat(80));
    console.log('📝 PROMPTS POUR GÉNÉRATION MANUELLE AVEC GEMINI');
    console.log('   Allez sur: https://aistudio.google.com/app/prompts/new_chat');
    console.log('   Sélectionnez un modèle avec génération d\'images (Gemini 2.0 Flash)');
    console.log('='.repeat(80));

    console.log('\n🍎 ALIMENTS (à sauvegarder dans public/images/compter/aliments/):\n');

    for (const img of IMAGES_A_GENERER.aliments) {
        console.log(`📸 ${img.nom}.png`);
        console.log(`   "${img.prompt}"\n`);
    }

    console.log('\n🏠 OBJETS MAISON (à sauvegarder dans public/images/compter/objets/):\n');

    for (const img of IMAGES_A_GENERER.objets) {
        console.log(`📸 ${img.nom}.png`);
        console.log(`   "${img.prompt}"\n`);
    }

    console.log('='.repeat(80));
    console.log('\n💡 ASTUCE: Vous pouvez copier plusieurs prompts à la fois et demander');
    console.log('   à Gemini de générer les images en lot.\n');
    console.log('   Exemple: "Génère ces 5 images: [liste des prompts]"\n');
}

function genererFichierPromptsHTML() {
    const outputPath = path.join(__dirname, '..', 'prompts-images.html');

    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Prompts pour génération d'images</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
        h1 { color: #8b5cf6; }
        h2 { color: #ec4899; margin-top: 40px; }
        .prompt-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
        }
        .prompt-card h3 { margin: 0 0 10px 0; color: #374151; }
        .prompt-text {
            background: #fff;
            border: 1px solid #d1d5db;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            cursor: pointer;
        }
        .prompt-text:hover { background: #f0fdf4; }
        .copy-btn {
            background: #8b5cf6;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        }
        .copy-btn:hover { background: #7c3aed; }
        .instructions {
            background: #dbeafe;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <h1>🎨 Prompts pour génération d'images</h1>

    <div class="instructions">
        <h3>📋 Instructions:</h3>
        <ol>
            <li>Ouvrez <a href="https://aistudio.google.com/app/prompts/new_chat" target="_blank">Google AI Studio</a></li>
            <li>Sélectionnez le modèle <strong>Gemini 2.0 Flash</strong> (supporte la génération d'images)</li>
            <li>Cliquez sur un prompt ci-dessous pour le copier</li>
            <li>Collez dans Gemini et attendez l'image</li>
            <li>Téléchargez l'image et renommez-la selon le nom indiqué</li>
            <li>Placez-la dans le bon dossier (aliments ou objets)</li>
        </ol>
        <p><strong>Dossier aliments:</strong> <code>public/images/compter/aliments/</code></p>
        <p><strong>Dossier objets:</strong> <code>public/images/compter/objets/</code></p>
    </div>

    <h2>🍎 Aliments</h2>
`;

    for (const img of IMAGES_A_GENERER.aliments) {
        html += `
    <div class="prompt-card">
        <h3>📸 ${img.nom}.png</h3>
        <div class="prompt-text" onclick="navigator.clipboard.writeText(this.innerText); this.style.background='#dcfce7';">
${img.prompt}
        </div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${img.prompt.replace(/'/g, "\\'")}'); alert('Copié!');">Copier le prompt</button>
    </div>`;
    }

    html += `\n    <h2>🏠 Objets de la maison</h2>\n`;

    for (const img of IMAGES_A_GENERER.objets) {
        html += `
    <div class="prompt-card">
        <h3>📸 ${img.nom}.png</h3>
        <div class="prompt-text" onclick="navigator.clipboard.writeText(this.innerText); this.style.background='#dcfce7';">
${img.prompt}
        </div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${img.prompt.replace(/'/g, "\\'")}'); alert('Copié!');">Copier le prompt</button>
    </div>`;
    }

    html += `
</body>
</html>`;

    fs.writeFileSync(outputPath, html);
    console.log(`\n✅ Fichier HTML créé: ${outputPath}`);
    console.log('   Ouvrez ce fichier dans votre navigateur pour copier facilement les prompts!\n');
}

async function main() {
    console.log('🎨 Script de génération d\'images pour le module Compter\n');

    if (!OPENROUTER_API_KEY) {
        console.log('⚠️  Clé OpenRouter non trouvée');
    } else {
        // Vérifier si des modèles d'images sont disponibles
        const modelesImage = await verifierModelesImage();

        if (modelesImage.length > 0) {
            console.log('\n🚀 Des modèles d\'images sont disponibles!');
            // TODO: Implémenter la génération automatique
        }
    }

    // Afficher les prompts pour génération manuelle
    afficherPromptsPourGemini();

    // Générer le fichier HTML d'aide
    genererFichierPromptsHTML();

    // Créer les dossiers si nécessaire
    const dossierAliments = path.join(__dirname, '..', 'public', 'images', 'compter', 'aliments');
    const dossierObjets = path.join(__dirname, '..', 'public', 'images', 'compter', 'objets');

    if (!fs.existsSync(dossierObjets)) {
        fs.mkdirSync(dossierObjets, { recursive: true });
        console.log(`📁 Dossier créé: ${dossierObjets}`);
    }

    // Lister les images existantes
    console.log('\n📊 Images existantes:\n');

    if (fs.existsSync(dossierAliments)) {
        const alimentsExistants = fs.readdirSync(dossierAliments).filter(f => f.endsWith('.png'));
        console.log(`   Aliments: ${alimentsExistants.length} images`);
        alimentsExistants.forEach(f => console.log(`      ✓ ${f}`));
    }

    if (fs.existsSync(dossierObjets)) {
        const objetsExistants = fs.readdirSync(dossierObjets).filter(f => f.endsWith('.png'));
        console.log(`   Objets: ${objetsExistants.length} images`);
        objetsExistants.forEach(f => console.log(`      ✓ ${f}`));
    }

    // Calculer ce qui manque
    const alimentsExistants = fs.existsSync(dossierAliments)
        ? fs.readdirSync(dossierAliments).map(f => f.replace('.png', ''))
        : [];
    const objetsExistants = fs.existsSync(dossierObjets)
        ? fs.readdirSync(dossierObjets).map(f => f.replace('.png', ''))
        : [];

    const alimentsManquants = IMAGES_A_GENERER.aliments.filter(i => !alimentsExistants.includes(i.nom));
    const objetsManquants = IMAGES_A_GENERER.objets.filter(i => !objetsExistants.includes(i.nom));

    console.log(`\n📋 Images à générer:`);
    console.log(`   Aliments manquants: ${alimentsManquants.length}`);
    console.log(`   Objets manquants: ${objetsManquants.length}`);
}

main();
