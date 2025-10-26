import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * API : Suivi Pédagogique d'un apprenant
 *
 * GET /api/admin/formation/suivi-apprenant/[id]
 *
 * Récupère toutes les données pédagogiques d'un apprenant :
 * - Infos générales, statut, planning
 * - Module Lire (textes, mots, syllabes, enregistrements)
 * - Module Quiz (sessions, scores)
 * - Module Formation (plans, compétences, exercices, résultats)
 * - Module Code de la Route (vocabulaire)
 * - Assiduité (absences, planning)
 * - Suivis pédagogiques et bilans
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    // Vérifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    const { id: apprenantId } = req.query

    if (!apprenantId) {
        return res.status(400).json({ error: 'ID apprenant manquant' })
    }

    try {
        // ============================================================================
        // 1. INFORMATIONS GÉNÉRALES APPRENANT
        // ============================================================================
        const { data: apprenant, error: apprenantError } = await supabase
            .from('users')
            .select(`
                id,
                prenom,
                nom,
                initiales,
                email,
                identifiant,
                role,
                dispositif,
                date_entree_formation,
                date_sortie_previsionnelle,
                date_fin_formation_reelle,
                lieu_formation_id,
                lieux:lieu_formation_id (
                    id,
                    nom,
                    couleur,
                    initiale
                ),
                statut_formation,
                date_suspension,
                motif_suspension,
                date_reprise_prevue,
                last_login,
                created_at
            `)
            .eq('id', apprenantId)
            .single()

        if (apprenantError) throw apprenantError
        if (!apprenant) {
            return res.status(404).json({ error: 'Apprenant non trouvé' })
        }

        // ============================================================================
        // 2. MODULE LIRE - Textes et activités de lecture
        // ============================================================================

        // 2.1 Textes créés
        const { data: textes } = await supabase
            .from('textes_references')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 2.2 Mots classifiés (mono/multisyllabes)
        const { data: motsClassifies } = await supabase
            .from('mots_classifies')
            .select(`
                *,
                texte:texte_reference_id (
                    id,
                    titre
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 2.3 Paniers de syllabes
        const { data: paniers } = await supabase
            .from('paniers_syllabes')
            .select(`
                *,
                texte:texte_id (
                    id,
                    titre
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 2.4 Enregistrements de groupes (audio)
        const { data: enregistrementsGroupes } = await supabase
            .from('enregistrements_groupes')
            .select(`
                *,
                groupe:groupe_sens_id (
                    id,
                    contenu,
                    texte_reference_id
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 2.5 Enregistrements de mots (audio)
        const { data: enregistrementsMots } = await supabase
            .from('enregistrements_mots')
            .select(`
                *,
                texte:texte_id (
                    id,
                    titre
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 2.6 Signalements syllabification
        const { data: signalements } = await supabase
            .from('signalements_syllabification')
            .select('*')
            .eq('utilisateur', `${apprenant.prenom} ${apprenant.nom}`)
            .order('date_signalement', { ascending: false })

        // Statistiques Module Lire
        const statsLire = {
            nombreTextes: textes?.length || 0,
            nombreMotsClassifies: motsClassifies?.length || 0,
            nombrePaniers: paniers?.length || 0,
            nombreEnregistrementsGroupes: enregistrementsGroupes?.length || 0,
            nombreEnregistrementsMots: enregistrementsMots?.length || 0,
            nombreSignalements: signalements?.length || 0,
            dureeEnregistrementsGroupes: enregistrementsGroupes?.reduce((sum, e) => sum + (parseFloat(e.duree_secondes) || 0), 0) || 0
        }

        // ============================================================================
        // 3. MODULE QUIZ
        // ============================================================================

        // 3.1 Sessions de quiz
        const { data: quizSessions } = await supabase
            .from('quiz_sessions')
            .select(`
                *,
                quiz:quiz_id (
                    id,
                    title,
                    category_id,
                    categories:category_id (
                        id,
                        name,
                        icon
                    )
                )
            `)
            .eq('user_id', apprenantId)
            .order('created_at', { ascending: false })

        // 3.2 Attributions de quiz
        const { data: quizAssignments } = await supabase
            .from('quiz_assignments')
            .select(`
                *,
                quiz:quiz_id (
                    id,
                    title
                ),
                assigneur:assigned_by (
                    id,
                    prenom,
                    nom
                )
            `)
            .eq('user_id', apprenantId)
            .order('assigned_at', { ascending: false })

        // Statistiques Quiz
        const quizCompletes = quizSessions?.filter(s => s.completed) || []
        const scoresMoyens = quizCompletes.length > 0
            ? quizCompletes.reduce((sum, s) => sum + (s.score || 0), 0) / quizCompletes.length
            : 0

        const statsQuiz = {
            nombreQuizEffectues: quizSessions?.length || 0,
            nombreQuizCompletes: quizCompletes.length,
            nombreQuizAttribues: quizAssignments?.length || 0,
            scoreMoyen: Math.round(scoresMoyens * 100) / 100,
            tauxCompletion: quizSessions?.length > 0
                ? Math.round((quizCompletes.length / quizSessions.length) * 100)
                : 0
        }

        // ============================================================================
        // 4. MODULE FORMATION
        // ============================================================================

        // 4.1 Plans de formation
        const { data: plans } = await supabase
            .from('formation_plans')
            .select(`
                *,
                formateur:formateur_id (
                    id,
                    prenom,
                    nom
                ),
                positionnement:positionnement_id (
                    id,
                    date_positionnement,
                    statut
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        const planActif = plans?.find(p => p.statut === 'en_cours') || plans?.[0]

        // 4.2 Compétences du plan actif
        let competencesPlan = []
        if (planActif) {
            const { data } = await supabase
                .from('formation_plan_competences')
                .select(`
                    *,
                    competence:competence_id (
                        id,
                        code,
                        intitule,
                        description,
                        contexte,
                        categorie:categorie_id (
                            id,
                            nom,
                            domaine:domaine_id (
                                id,
                                nom,
                                emoji
                            )
                        )
                    )
                `)
                .eq('plan_id', planActif.id)
                .order('priorite', { ascending: true })

            competencesPlan = data || []
        }

        // 4.3 Positionnements
        const { data: positionnements } = await supabase
            .from('formation_positionnements')
            .select(`
                *,
                formateur:formateur_id (
                    id,
                    prenom,
                    nom
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('date_positionnement', { ascending: false })

        // 4.4 Évaluations du positionnement initial
        let evaluationsPositionnement = []
        if (positionnements && positionnements.length > 0) {
            const { data } = await supabase
                .from('formation_evaluations_positionnement')
                .select(`
                    *,
                    competence:competence_id (
                        id,
                        intitule,
                        code
                    )
                `)
                .eq('positionnement_id', positionnements[0].id)

            evaluationsPositionnement = data || []
        }

        // 4.5 Exercices attribués
        const { data: exercicesAttribues } = await supabase
            .from('formation_attributions_exercices')
            .select(`
                *,
                createur:created_by (
                    id,
                    prenom,
                    nom
                ),
                competence:competence_cible_id (
                    id,
                    intitule,
                    code
                ),
                quiz:quiz_id (
                    id,
                    title
                ),
                texte:texte_id (
                    id,
                    titre
                ),
                vocabulaire:vocabulaire_id (
                    id,
                    mot,
                    categorie
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('date_attribution', { ascending: false })

        // 4.6 Résultats des exercices
        const { data: resultatsExercices } = await supabase
            .from('formation_resultats_exercices')
            .select(`
                *,
                attribution:attribution_id (
                    id,
                    titre,
                    type_exercice
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 4.7 Assignations d'exercices pédagogiques
        const { data: exercicesAssignations } = await supabase
            .from('formation_exercices_assignations')
            .select(`
                *,
                exercice:exercice_id (
                    id,
                    titre,
                    type,
                    difficulte,
                    competence:competence_id (
                        id,
                        intitule,
                        code
                    )
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('date_assignation', { ascending: false })

        // 4.8 Suivis pédagogiques
        const { data: suivis } = await supabase
            .from('formation_suivis_pedagogiques')
            .select(`
                *,
                formateur:formateur_id (
                    id,
                    prenom,
                    nom
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('date_suivi', { ascending: false })

        // 4.9 Bilans
        const { data: bilans } = await supabase
            .from('formation_bilans')
            .select(`
                *,
                formateur:formateur_id (
                    id,
                    prenom,
                    nom
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('date_bilan', { ascending: false })

        // Statistiques Formation
        const competencesAcquises = competencesPlan?.filter(c => c.statut === 'acquis').length || 0
        const competencesEnCours = competencesPlan?.filter(c => c.statut === 'en_cours').length || 0
        const competencesATravailler = competencesPlan?.filter(c => c.statut === 'a_travailler').length || 0

        const exercicesTermines = exercicesAttribues?.filter(e => e.statut === 'termine').length || 0
        const exercicesEnCours = exercicesAttribues?.filter(e => e.statut === 'commence').length || 0
        const exercicesAFaire = exercicesAttribues?.filter(e => e.statut === 'attribue').length || 0

        const scoreMoyenExercices = resultatsExercices?.length > 0
            ? resultatsExercices.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / resultatsExercices.length
            : 0

        const statsFormation = {
            nombrePlans: plans?.length || 0,
            planActif: planActif ? true : false,
            nombreCompetencesCiblees: competencesPlan?.length || 0,
            competencesAcquises,
            competencesEnCours,
            competencesATravailler,
            tauxProgressionCompetences: competencesPlan?.length > 0
                ? Math.round((competencesAcquises / competencesPlan.length) * 100)
                : 0,
            nombreExercicesAttribues: exercicesAttribues?.length || 0,
            exercicesTermines,
            exercicesEnCours,
            exercicesAFaire,
            nombreResultatsExercices: resultatsExercices?.length || 0,
            scoreMoyenExercices: Math.round(scoreMoyenExercices * 100) / 100,
            nombreSuivis: suivis?.length || 0,
            nombreBilans: bilans?.length || 0
        }

        // ============================================================================
        // 5. MODULE CODE DE LA ROUTE
        // ============================================================================

        // 5.1 Progression vocabulaire
        const { data: progressionVocabulaire } = await supabase
            .from('progression_vocabulaire_code_route')
            .select(`
                *,
                vocabulaire:vocabulaire_id (
                    id,
                    mot,
                    categorie,
                    definition_simple,
                    emoji
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        // 5.2 Définitions personnalisées
        const { data: definitionsPersonnalisees } = await supabase
            .from('definitions_personnalisees_code_route')
            .select(`
                *,
                vocabulaire:vocabulaire_id (
                    id,
                    mot,
                    categorie
                )
            `)
            .eq('apprenant_id', apprenantId)
            .order('date_creation', { ascending: false })

        // Statistiques Code Route
        const motsMaitrises = progressionVocabulaire?.filter(p => p.statut === 'maitrise').length || 0
        const motsEnCours = progressionVocabulaire?.filter(p => p.statut === 'en_cours').length || 0

        const statsCodeRoute = {
            nombreMotsTravailles: progressionVocabulaire?.length || 0,
            motsMaitrises,
            motsEnCours,
            nombreDefinitionsPersonnalisees: definitionsPersonnalisees?.length || 0,
            tauxMaitrise: progressionVocabulaire?.length > 0
                ? Math.round((motsMaitrises / progressionVocabulaire.length) * 100)
                : 0
        }

        // ============================================================================
        // 6. ASSIDUITÉ ET PLANNING
        // ============================================================================

        // 6.1 Planning type
        const { data: planningType } = await supabase
            .from('planning_apprenants')
            .select(`
                *,
                lieu:lieu_id (
                    id,
                    nom,
                    initiale,
                    couleur
                )
            `)
            .eq('apprenant_id', apprenantId)
            .eq('actif', true)
            .order('jour', { ascending: true })

        // 6.2 Absences
        const { data: absences } = await supabase
            .from('absences_apprenants')
            .select(`
                *,
                lieu:lieu_id (
                    id,
                    nom
                ),
                createur:created_by (
                    id,
                    prenom,
                    nom
                )
            `)
            .eq('apprenant_id', apprenantId)
            .eq('statut', 'actif')
            .order('created_at', { ascending: false })

        // 6.3 Suspensions de parcours
        const { data: suspensions } = await supabase
            .from('suspensions_parcours')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('date_suspension', { ascending: false })

        // Statistiques Assiduité
        const absencesPeriode = absences?.filter(a => a.type === 'absence_periode').length || 0
        const absencesPonctuelles = absences?.filter(a => a.type === 'absence_ponctuelle').length || 0
        const presencesExceptionnelles = absences?.filter(a => a.type === 'presence_exceptionnelle').length || 0

        const statsAssiduite = {
            nombreCreneauxPlanningType: planningType?.length || 0,
            nombreAbsencesTotales: absences?.length || 0,
            absencesPeriode,
            absencesPonctuelles,
            presencesExceptionnelles,
            nombreSuspensions: suspensions?.length || 0
        }

        // ============================================================================
        // 7. RÉPONSE FINALE
        // ============================================================================

        const response = {
            // Informations générales
            apprenant: {
                ...apprenant,
                lieu: apprenant.lieux // Renommer pour clarté
            },

            // Statistiques globales
            statistiques: {
                lire: statsLire,
                quiz: statsQuiz,
                formation: statsFormation,
                codeRoute: statsCodeRoute,
                assiduite: statsAssiduite
            },

            // Données détaillées par module
            moduleLire: {
                textes: textes || [],
                motsClassifies: motsClassifies || [],
                paniers: paniers || [],
                enregistrementsGroupes: enregistrementsGroupes || [],
                enregistrementsMots: enregistrementsMots || [],
                signalements: signalements || []
            },

            moduleQuiz: {
                sessions: quizSessions || [],
                assignments: quizAssignments || []
            },

            moduleFormation: {
                plans: plans || [],
                planActif: planActif || null,
                competencesPlan: competencesPlan || [],
                positionnements: positionnements || [],
                evaluationsPositionnement: evaluationsPositionnement || [],
                exercicesAttribues: exercicesAttribues || [],
                resultatsExercices: resultatsExercices || [],
                exercicesAssignations: exercicesAssignations || [],
                suivis: suivis || [],
                bilans: bilans || []
            },

            moduleCodeRoute: {
                progressionVocabulaire: progressionVocabulaire || [],
                definitionsPersonnalisees: definitionsPersonnalisees || []
            },

            assiduite: {
                planningType: planningType || [],
                absences: absences || [],
                suspensions: suspensions || []
            }
        }

        return res.status(200).json(response)

    } catch (error) {
        console.error('Erreur API suivi-apprenant:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
