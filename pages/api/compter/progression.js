import { supabase } from '../../../lib/supabaseClient'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
    // Vérifier l'authentification
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé' })
    }

    const token = authHeader.split(' ')[1]
    let userId

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        userId = decoded.userId
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    if (req.method === 'POST') {
        // Enregistrer une progression
        const {
            activite,
            contexte_code,
            reussi,
            score,
            temps_secondes,
            nb_erreurs,
            nb_tentatives,
            details
        } = req.body

        // Validation
        if (!activite || reussi === undefined) {
            return res.status(400).json({ error: 'Données manquantes' })
        }

        const validActivites = ['ranger', 'trier', 'associer', 'compter', 'memoriser']
        if (!validActivites.includes(activite)) {
            return res.status(400).json({ error: 'Activité invalide' })
        }

        try {
            const { data, error } = await supabase
                .from('compter_progression')
                .insert({
                    apprenant_id: userId,
                    activite,
                    contexte_code: contexte_code || null,
                    reussi,
                    score: score || 0,
                    temps_secondes: temps_secondes || 0,
                    nb_erreurs: nb_erreurs || 0,
                    nb_tentatives: nb_tentatives || 1,
                    details: details || {}
                })
                .select()
                .single()

            if (error) {
                // Si la table n'existe pas encore, retourner un succès silencieux
                if (error.code === '42P01') {
                    console.log('Table compter_progression non créée, progression non sauvegardée')
                    return res.status(200).json({
                        message: 'Progression non sauvegardée (table non créée)',
                        warning: true
                    })
                }
                throw error
            }

            return res.status(201).json({
                message: 'Progression enregistrée',
                data
            })
        } catch (error) {
            console.error('Erreur enregistrement progression:', error)
            // Retourner un succès même en cas d'erreur pour ne pas bloquer l'UX
            return res.status(200).json({
                message: 'Progression non sauvegardée',
                warning: true,
                error: error.message
            })
        }
    } else if (req.method === 'GET') {
        // Récupérer la progression de l'utilisateur
        const { activite, limit = 50 } = req.query

        try {
            let query = supabase
                .from('compter_progression')
                .select('*')
                .eq('apprenant_id', userId)
                .order('date_realisation', { ascending: false })
                .limit(parseInt(limit))

            if (activite) {
                query = query.eq('activite', activite)
            }

            const { data, error } = await query

            if (error) {
                // Si la table n'existe pas encore
                if (error.code === '42P01') {
                    return res.status(200).json({
                        progressions: [],
                        statistiques: {
                            total: 0,
                            reussites: 0,
                            echecs: 0,
                            score_moyen: 0
                        },
                        warning: 'Table non créée'
                    })
                }
                throw error
            }

            // Calculer les statistiques
            const statistiques = {
                total: data.length,
                reussites: data.filter(p => p.reussi).length,
                echecs: data.filter(p => !p.reussi).length,
                score_moyen: data.length > 0
                    ? Math.round(data.reduce((acc, p) => acc + (p.score || 0), 0) / data.length)
                    : 0,
                par_activite: {}
            }

            // Stats par activité
            const activites = ['ranger', 'trier', 'associer', 'compter', 'memoriser']
            activites.forEach(act => {
                const filtered = data.filter(p => p.activite === act)
                statistiques.par_activite[act] = {
                    total: filtered.length,
                    reussites: filtered.filter(p => p.reussi).length,
                    score_moyen: filtered.length > 0
                        ? Math.round(filtered.reduce((acc, p) => acc + (p.score || 0), 0) / filtered.length)
                        : 0
                }
            })

            return res.status(200).json({
                progressions: data,
                statistiques
            })
        } catch (error) {
            console.error('Erreur récupération progression:', error)
            return res.status(200).json({
                progressions: [],
                statistiques: {
                    total: 0,
                    reussites: 0,
                    echecs: 0,
                    score_moyen: 0
                },
                error: error.message
            })
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Méthode ${req.method} non autorisée` })
    }
}
