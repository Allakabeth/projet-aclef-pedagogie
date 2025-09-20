import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * API Next.js pour générer des fichiers audio TTS
 * Method: POST
 * Body: { "text": "texte à convertir" }
 * Response: { "success": true, "filename": "audio_xxx.mp3", "url": "/audio/audio_xxx.mp3" }
 */
export default async function handler(req, res) {
  // Logging de la requête
  // console.log(`[${new Date().toISOString()}] Requête TTS reçue:`, req.method);

  try {
    // Vérification de la méthode HTTP
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Méthode non autorisée. Utilisez POST.',
        allowedMethods: ['POST']
      });
    }

    // Vérification du body
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: 'Corps de la requête manquant'
      });
    }

    // Extraction et validation du texte
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre "text" est requis et doit être une chaîne non vide'
      });
    }

    // Limitation de la taille du texte (sécurité)
    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Le texte ne peut pas dépasser 1000 caractères'
      });
    }

    // Chemin vers le script Python
    const scriptPath = path.join(process.cwd(), 'public', 'audio', 'generate_single_audio.py');
    
    // Vérification de l'existence du script
    if (!fs.existsSync(scriptPath)) {
      // console.error('Script Python non trouvé:', scriptPath);
      return res.status(500).json({
        success: false,
        error: 'Script de génération audio non trouvé'
      });
    }

    // Échappement du texte pour la ligne de commande
    const escapedText = text.replace(/"/g, '\\"');
    
    // Commande à exécuter
    const command = `python "${scriptPath}" "${escapedText}"`;
    
    // console.log(`[${new Date().toISOString()}] Exécution de la commande:`, command);

    // Promesse pour l'exécution du script Python
    const result = await new Promise((resolve, reject) => {
      exec(command, {
        timeout: 30000, // Timeout de 30 secondes
        cwd: path.dirname(scriptPath)
      }, (error, stdout, stderr) => {
        
        // console.log(`[${new Date().toISOString()}] Script terminé`);
        // console.log('STDOUT:', stdout);
        
        if (stderr) {
          // console.log('STDERR:', stderr);
        }

        if (error) {
          // console.error('Erreur d\'exécution:', error);
          reject(error);
          return;
        }

        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      });
    });

    // Parsing de la sortie du script Python
    const output = result.stdout;
    
    if (!output) {
      return res.status(500).json({
        success: false,
        error: 'Aucune sortie du script Python'
      });
    }

    // Vérification du format de sortie SUCCESS: ou ERROR:
    if (output.startsWith('SUCCESS:')) {
      const filename = output.replace('SUCCESS:', '').trim();
      
      if (!filename) {
        return res.status(500).json({
          success: false,
          error: 'Nom de fichier manquant dans la réponse du script'
        });
      }

      // Vérification que le fichier a été effectivement créé
      const audioFilePath = path.join(process.cwd(), 'public', 'audio', filename);
      
      if (!fs.existsSync(audioFilePath)) {
        return res.status(500).json({
          success: false,
          error: 'Le fichier audio n\'a pas été créé correctement'
        });
      }

      // Vérification de la taille du fichier
      const stats = fs.statSync(audioFilePath);
      if (stats.size === 0) {
        // Supprimer le fichier vide
        fs.unlinkSync(audioFilePath);
        return res.status(500).json({
          success: false,
          error: 'Le fichier audio généré est vide'
        });
      }

      // URL publique du fichier audio
      const audioUrl = `/audio/${filename}`;

      // console.log(`[${new Date().toISOString()}] Fichier audio généré avec succès:`, filename);

      return res.status(200).json({
        success: true,
        filename: filename,
        url: audioUrl,
        size: stats.size,
        message: 'Fichier audio généré avec succès'
      });

    } else if (output.startsWith('ERROR:')) {
      const errorMessage = output.replace('ERROR:', '').trim();
      
      // console.error(`[${new Date().toISOString()}] Erreur du script Python:`, errorMessage);
      
      return res.status(500).json({
        success: false,
        error: `Erreur de génération audio: ${errorMessage}`
      });

    } else {
      // console.error(`[${new Date().toISOString()}] Format de sortie inattendu:`, output);
      
      return res.status(500).json({
        success: false,
        error: 'Format de réponse du script invalide',
        output: output
      });
    }

  } catch (error) {
    // console.error(`[${new Date().toISOString()}] Erreur dans l'API generate-audio:`, error);

    // Gestion des différents types d'erreurs
    if (error.code === 'ENOENT') {
      return res.status(500).json({
        success: false,
        error: 'Python n\'est pas installé ou n\'est pas accessible'
      });
    }

    if (error.killed && error.signal === 'SIGTERM') {
      return res.status(408).json({
        success: false,
        error: 'Timeout: La génération audio a pris trop de temps'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}