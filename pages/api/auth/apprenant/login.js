import { supabase } from '../../../../lib/supabaseClient'
import { generateTokenPair } from '../../../../lib/jwt'
import bcrypt from 'bcryptjs'

/**
 * Normalise un texte pour comparaison
 * José → jose, Martínez → martinez
 */
const normalizeText = (text) => {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { identifiant, password } = req.body

    if (!identifiant || !password) {
        return res.status(400).json({ 
            error: 'Identifiant et mot de passe requis' 
        })
    }

    try {
        console.log(`🔐 [LOGIN-APPRENANT] Tentative login identifiant="${identifiant}"`)

        // Test de connexion Supabase - détecter si le service est down
        const { error: connectionError } = await supabase
            .from('users')
            .select('id')
            .limit(1)

        if (connectionError) {
            console.error('🔐 [LOGIN-APPRENANT] Supabase inaccessible:', connectionError.message)
            // Vérifier si c'est une erreur de connexion/réseau
            if (connectionError.message?.includes('fetch') ||
                connectionError.message?.includes('network') ||
                connectionError.message?.includes('ECONNREFUSED') ||
                connectionError.message?.includes('timeout') ||
                connectionError.code === 'PGRST301' ||
                connectionError.code === '503') {
                return res.status(503).json({
                    error: 'Service temporairement indisponible',
                    message: 'Le service est momentanément inaccessible. Veuillez réessayer dans quelques minutes.'
                })
            }
        }

        // 0. Vérifier d'abord si le compte existe mais est archivé
        const { data: apprenantArchive, error: archiveError } = await supabase
            .from('users')
            .select('id, identifiant, prenom, nom, archive')
            .eq('identifiant', identifiant)
            .eq('role', 'apprenant')
            .eq('archive', true)
            .single()

        if (apprenantArchive && !archiveError) {
            console.log(`🔐 [LOGIN-APPRENANT] Compte archivé détecté: ${apprenantArchive.prenom} ${apprenantArchive.nom}`)
            return res.status(403).json({
                error: '⚠️ Votre compte a été archivé',
                message: 'Votre compte a été archivé et ne peut plus se connecter. Contactez votre formateur pour le réactiver.',
                archived: true
            })
        }

        // 1. Chercher l'apprenant par identifiant exact (non archivé)
        const { data: apprenantExact, error: exactError } = await supabase
            .from('users')
            .select('*')
            .eq('identifiant', identifiant)
            .eq('role', 'apprenant')
            .eq('archive', false)
            .single()
        
        // Si trouvé avec l'identifiant exact
        if (apprenantExact && !exactError) {
            console.log(`🔐 [LOGIN-APPRENANT] Apprenant trouvé: ${apprenantExact.prenom} ${apprenantExact.nom}`)
            
            // Vérifier le mot de passe
            let passwordValid = false
            
            if (apprenantExact.password_hash) {
                // Si un hash existe, utiliser bcrypt
                passwordValid = await bcrypt.compare(password, apprenantExact.password_hash)
            } else {
                // Sinon utiliser le nom de famille exact (sensible à la casse)
                passwordValid = (password === apprenantExact.nom)
            }
            
            if (passwordValid) {
                // Connexion réussie
                const tokens = generateTokenPair({
                    id: apprenantExact.id,
                    apprenant_id: apprenantExact.id,
                    identifiant: apprenantExact.identifiant,
                    nom: apprenantExact.nom,
                    prenom: apprenantExact.prenom,
                    role: 'apprenant'
                })

                return res.status(200).json({
                    success: true,
                    user: {
                        id: apprenantExact.id,
                        identifiant: apprenantExact.identifiant,
                        nom: apprenantExact.nom,
                        prenom: apprenantExact.prenom,
                        role: 'apprenant',
                        mustChangePassword: !apprenantExact.password_hash
                    },
                    tokens: {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        expiresIn: tokens.expiresIn,
                        tokenType: tokens.tokenType
                    }
                })
            }
        }
        
        // 2. Si pas trouvé ou mot de passe incorrect, chercher par prénom pour aide intelligente
        console.log(`🔐 [LOGIN-APPRENANT] Recherche intelligente pour aide...`)
        
        const identifiantNormalized = normalizeText(identifiant)
        
        // Chercher tous les apprenants avec un prénom similaire
        const { data: apprenantsAvecPrenomSimilaire, error: searchError } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'apprenant')
            .eq('archive', false)
        
        if (apprenantsAvecPrenomSimilaire && !searchError) {
            // Filtrer ceux qui ont un prénom qui commence par l'identifiant saisi
            const apprenantsPotentiels = apprenantsAvecPrenomSimilaire.filter(a => {
                const prenomNorm = normalizeText(a.prenom)
                return prenomNorm === identifiantNormalized || 
                       (a.identifiant && normalizeText(a.identifiant).startsWith(identifiantNormalized))
            })
            
            console.log(`🔐 [LOGIN-APPRENANT] ${apprenantsPotentiels.length} apprenants potentiels trouvés`)
            
            // Vérifier si le mot de passe correspond à l'un des noms (exact, sensible à la casse)
            for (const apprenant of apprenantsPotentiels) {
                if (password === apprenant.nom) {
                    // On a trouvé l'apprenant !
                    console.log(`🔐 [LOGIN-APPRENANT] Apprenant identifié: ${apprenant.prenom} ${apprenant.nom}`)

                    // Message d'aide intelligent
                    return res.status(401).json({
                        error: 'Identifiants incorrects',
                        help: true,
                        message: `Nous avons détecté que vous êtes ${apprenant.prenom} ${apprenant.nom}.`,
                        suggestion: {
                            text: `Votre identifiant est : ${apprenant.identifiant || apprenant.prenom}`,
                            identifiant: apprenant.identifiant || apprenant.prenom,
                            hint: 'Utilisez cet identifiant avec votre mot de passe'
                        }
                    })
                }
            }
            
            // Si on a des apprenants avec ce prénom mais pas le bon mot de passe
            if (apprenantsPotentiels.length > 0) {
                const identifiants = apprenantsPotentiels
                    .map(a => a.identifiant || a.prenom)
                    .filter((v, i, arr) => arr.indexOf(v) === i) // Unique
                
                if (identifiants.length === 1) {
                    return res.status(401).json({
                        error: 'Mot de passe incorrect',
                        help: true,
                        message: `L'identifiant ${identifiants[0]} existe.`,
                        suggestion: {
                            text: 'Vérifiez votre mot de passe',
                            hint: 'Le mot de passe initial est votre nom de famille (respectez les majuscules/minuscules)'
                        }
                    })
                } else {
                    return res.status(401).json({
                        error: 'Identifiants incorrects',
                        help: true,
                        message: `Plusieurs identifiants possibles trouvés.`,
                        suggestion: {
                            text: `Essayez avec : ${identifiants.join(', ')}`,
                            hint: 'Utilisez votre nom de famille comme mot de passe (respectez les majuscules/minuscules)'
                        }
                    })
                }
            }
        }
        
        // 3. Aucune correspondance trouvée
        return res.status(401).json({ 
            error: 'Identifiants incorrects',
            help: false
        })

    } catch (error) {
        console.error('Erreur login apprenant:', error)
        // Erreur de connexion/réseau → service indisponible
        return res.status(503).json({
            error: 'Service temporairement indisponible',
            message: 'Le service est momentanément inaccessible. Veuillez réessayer dans quelques minutes.'
        })
    }
}