import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page : Détail du suivi pédagogique d'un apprenant
 *
 * Affiche toutes les données d'activité d'un apprenant :
 * - Informations générales et statistiques globales
 * - Onglets : Vue d'ensemble, Lire, Quiz, Formation, Code Route, Assiduité, Suivis
 */
export default function SuiviPedagogiqueDetail() {
    const router = useRouter()
    const { id: apprenantId } = router.query

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('vue-ensemble')

    useEffect(() => {
        if (apprenantId) {
            loadData()
        }
    }, [apprenantId])

    async function loadData() {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const res = await fetch(`/api/admin/formation/suivi-apprenant/${apprenantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Erreur lors du chargement des données')
            }

            const responseData = await res.json()
            setData(responseData)
        } catch (err) {
            console.error('Erreur chargement suivi:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <p>Chargement du suivi pédagogique...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadData} style={styles.retryButton}>
                        Réessayer
                    </button>
                    <button
                        onClick={() => router.push('/admin/formation/suivi-pedagogique')}
                        style={{ ...styles.retryButton, marginLeft: '12px', backgroundColor: '#f5f5f5', color: '#333' }}
                    >
                        Retour à la liste
                    </button>
                </div>
            </div>
        )
    }

    if (!data) {
        return null
    }

    const { apprenant, statistiques, moduleLire, moduleQuiz, moduleFormation, moduleCodeRoute, assiduite } = data

    return (
        <div style={styles.container}>
            {/* En-tête apprenant */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>
                        👤 {apprenant.prenom} {apprenant.nom}
                        {apprenant.initiales && <span style={styles.initiales}>({apprenant.initiales})</span>}
                    </h1>
                    <button
                        onClick={() => router.push('/admin/formation/suivi-pedagogique')}
                        style={styles.backButtonTop}
                    >
                        ← Retour à la liste
                    </button>
                </div>

                <div style={styles.headerInfo}>
                    {apprenant.lieu && (
                        <div style={styles.infoBadge}>
                            <span style={{ ...styles.badge, backgroundColor: apprenant.lieu.couleur || '#2196f3' }}>
                                📍 {apprenant.lieu.nom}
                            </span>
                        </div>
                    )}
                    {apprenant.dispositif && (
                        <div style={styles.infoBadge}>
                            <span style={styles.badge}>
                                📋 {apprenant.dispositif}
                            </span>
                        </div>
                    )}
                    {apprenant.statut_formation && (
                        <div style={styles.infoBadge}>
                            <span style={{
                                ...styles.badge,
                                backgroundColor: getStatutColor(apprenant.statut_formation)
                            }}>
                                {getStatutIcon(apprenant.statut_formation)} {formatStatut(apprenant.statut_formation)}
                            </span>
                        </div>
                    )}
                </div>

                <div style={styles.headerDates}>
                    {apprenant.date_entree_formation && (
                        <p style={styles.dateText}>
                            📅 Entrée: {formatDate(apprenant.date_entree_formation)}
                        </p>
                    )}
                    {apprenant.date_sortie_previsionnelle && (
                        <p style={styles.dateText}>
                            📅 Sortie prévue: {formatDate(apprenant.date_sortie_previsionnelle)}
                        </p>
                    )}
                    {apprenant.last_login && (
                        <p style={styles.dateText}>
                            🕒 Dernière connexion: {formatDateTime(apprenant.last_login)}
                        </p>
                    )}
                </div>
            </div>

            {/* Statistiques globales */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📚</div>
                    <div style={styles.statValue}>{statistiques.lire.nombreTextes}</div>
                    <div style={styles.statLabel}>Textes créés</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🎯</div>
                    <div style={styles.statValue}>{statistiques.quiz.nombreQuizEffectues}</div>
                    <div style={styles.statLabel}>Quiz effectués</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🎓</div>
                    <div style={styles.statValue}>{statistiques.formation.nombreExercicesAttribues}</div>
                    <div style={styles.statLabel}>Exercices attribués</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>✅</div>
                    <div style={styles.statValue}>
                        {statistiques.formation.competencesAcquises}/{statistiques.formation.nombreCompetencesCiblees}
                    </div>
                    <div style={styles.statLabel}>Compétences acquises</div>
                </div>
            </div>

            {/* Onglets */}
            <div style={styles.tabsContainer}>
                <div style={styles.tabsHeader}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.tabButton,
                                ...(activeTab === tab.id ? styles.tabButtonActive : {})
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div style={styles.tabContent}>
                    {activeTab === 'vue-ensemble' && (
                        <VueEnsemble
                            statistiques={statistiques}
                            apprenant={apprenant}
                            moduleFormation={moduleFormation}
                        />
                    )}
                    {activeTab === 'lire' && (
                        <ModuleLire
                            statistiques={statistiques.lire}
                            data={moduleLire}
                        />
                    )}
                    {activeTab === 'quiz' && (
                        <ModuleQuiz
                            statistiques={statistiques.quiz}
                            data={moduleQuiz}
                        />
                    )}
                    {activeTab === 'formation' && (
                        <ModuleFormation
                            statistiques={statistiques.formation}
                            data={moduleFormation}
                        />
                    )}
                    {activeTab === 'code-route' && (
                        <ModuleCodeRoute
                            statistiques={statistiques.codeRoute}
                            data={moduleCodeRoute}
                        />
                    )}
                    {activeTab === 'assiduite' && (
                        <ModuleAssiduite
                            statistiques={statistiques.assiduite}
                            data={assiduite}
                        />
                    )}
                    {activeTab === 'suivis' && (
                        <ModuleSuivis
                            data={moduleFormation}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// COMPOSANTS DES ONGLETS
// ============================================================================

function VueEnsemble({ statistiques, apprenant, moduleFormation }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>📊 Vue d'ensemble</h2>

            <div style={styles.overviewGrid}>
                {/* Module Lire */}
                <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>📚 Module Lire</h3>
                    <div style={styles.overviewStats}>
                        <StatItem label="Textes créés" value={statistiques.lire.nombreTextes} />
                        <StatItem label="Mots classifiés" value={statistiques.lire.nombreMotsClassifies} />
                        <StatItem label="Paniers créés" value={statistiques.lire.nombrePaniers} />
                        <StatItem label="Enregistrements groupes" value={statistiques.lire.nombreEnregistrementsGroupes} />
                        <StatItem label="Enregistrements mots" value={statistiques.lire.nombreEnregistrementsMots} />
                    </div>
                </div>

                {/* Module Quiz */}
                <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>🎯 Module Quiz</h3>
                    <div style={styles.overviewStats}>
                        <StatItem label="Quiz effectués" value={statistiques.quiz.nombreQuizEffectues} />
                        <StatItem label="Quiz complétés" value={statistiques.quiz.nombreQuizCompletes} />
                        <StatItem label="Score moyen" value={`${statistiques.quiz.scoreMoyen}/100`} />
                        <StatItem label="Taux de complétion" value={`${statistiques.quiz.tauxCompletion}%`} />
                    </div>
                </div>

                {/* Module Formation */}
                <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>🎓 Module Formation</h3>
                    <div style={styles.overviewStats}>
                        <StatItem label="Compétences acquises" value={statistiques.formation.competencesAcquises} />
                        <StatItem label="Compétences en cours" value={statistiques.formation.competencesEnCours} />
                        <StatItem label="Exercices terminés" value={statistiques.formation.exercicesTermines} />
                        <StatItem label="Score moyen exercices" value={`${statistiques.formation.scoreMoyenExercices}/100`} />
                        <StatItem label="Suivis pédagogiques" value={statistiques.formation.nombreSuivis} />
                    </div>
                </div>

                {/* Module Code Route */}
                <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>📖 Code de la Route</h3>
                    <div style={styles.overviewStats}>
                        <StatItem label="Mots travaillés" value={statistiques.codeRoute.nombreMotsTravailles} />
                        <StatItem label="Mots maîtrisés" value={statistiques.codeRoute.motsMaitrises} />
                        <StatItem label="Taux de maîtrise" value={`${statistiques.codeRoute.tauxMaitrise}%`} />
                        <StatItem label="Définitions personnalisées" value={statistiques.codeRoute.nombreDefinitionsPersonnalisees} />
                    </div>
                </div>

                {/* Assiduité */}
                <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>📅 Assiduité</h3>
                    <div style={styles.overviewStats}>
                        <StatItem label="Créneaux planning" value={statistiques.assiduite.nombreCreneauxPlanningType} />
                        <StatItem label="Absences totales" value={statistiques.assiduite.nombreAbsencesTotales} />
                        <StatItem label="Absences période" value={statistiques.assiduite.absencesPeriode} />
                        <StatItem label="Absences ponctuelles" value={statistiques.assiduite.absencesPonctuelles} />
                    </div>
                </div>

                {/* Plan de formation */}
                {moduleFormation.planActif && (
                    <div style={styles.overviewCard}>
                        <h3 style={styles.overviewCardTitle}>📋 Plan de formation actif</h3>
                        <div style={styles.planInfo}>
                            <p><strong>Objectif:</strong> {moduleFormation.planActif.objectif_principal}</p>
                            <p><strong>Début:</strong> {formatDate(moduleFormation.planActif.date_debut)}</p>
                            {moduleFormation.planActif.date_fin_prevue && (
                                <p><strong>Fin prévue:</strong> {formatDate(moduleFormation.planActif.date_fin_prevue)}</p>
                            )}
                            <p><strong>Statut:</strong> {formatStatut(moduleFormation.planActif.statut)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function ModuleLire({ statistiques, data }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>📚 Module Lire</h2>

            {/* Statistiques */}
            <div style={styles.statsRow}>
                <StatCard icon="📄" label="Textes" value={statistiques.nombreTextes} />
                <StatCard icon="📝" label="Mots classifiés" value={statistiques.nombreMotsClassifies} />
                <StatCard icon="🗂️" label="Paniers" value={statistiques.nombrePaniers} />
                <StatCard icon="🎙️" label="Enregistrements" value={statistiques.nombreEnregistrementsGroupes + statistiques.nombreEnregistrementsMots} />
            </div>

            {/* Textes créés */}
            {data.textes.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📄 Textes créés ({data.textes.length})</h3>
                    <div style={styles.listContainer}>
                        {data.textes.map(texte => (
                            <div key={texte.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>{texte.titre}</strong>
                                    <span style={styles.listItemDate}>{formatDate(texte.created_at)}</span>
                                </div>
                                <div style={styles.listItemStats}>
                                    <span>📊 {texte.nombre_groupes} groupes</span>
                                    <span>📝 {texte.nombre_mots_total} mots</span>
                                    <span>🔤 {texte.nombre_mots_multi_syllabes} multisyllabes</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Paniers de syllabes */}
            {data.paniers.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>🗂️ Paniers de syllabes ({data.paniers.length})</h3>
                    <div style={styles.listContainer}>
                        {data.paniers.map(panier => (
                            <div key={panier.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>
                                        Panier {panier.lettre_panier}: {panier.nom_panier || 'Sans nom'}
                                    </strong>
                                    <span style={styles.listItemDate}>{formatDate(panier.created_at)}</span>
                                </div>
                                {panier.texte && (
                                    <p style={styles.listItemMeta}>Texte: {panier.texte.titre}</p>
                                )}
                                <p style={styles.listItemMeta}>
                                    Syllabes: {panier.syllabes ? JSON.parse(panier.syllabes).length : 0}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ModuleQuiz({ statistiques, data }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>🎯 Module Quiz</h2>

            {/* Statistiques */}
            <div style={styles.statsRow}>
                <StatCard icon="🎯" label="Quiz effectués" value={statistiques.nombreQuizEffectues} />
                <StatCard icon="✅" label="Complétés" value={statistiques.nombreQuizCompletes} />
                <StatCard icon="📊" label="Score moyen" value={`${statistiques.scoreMoyen}%`} />
                <StatCard icon="📈" label="Taux complétion" value={`${statistiques.tauxCompletion}%`} />
            </div>

            {/* Sessions de quiz */}
            {data.sessions.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>🎯 Sessions de quiz ({data.sessions.length})</h3>
                    <div style={styles.listContainer}>
                        {data.sessions.map(session => (
                            <div key={session.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>{session.quiz?.title || 'Quiz sans titre'}</strong>
                                    <span style={styles.listItemDate}>{formatDateTime(session.created_at)}</span>
                                </div>
                                <div style={styles.listItemStats}>
                                    <span>
                                        📊 Score: {session.score}/{session.total_questions}
                                    </span>
                                    <span>
                                        {session.completed ? '✅ Terminé' : '⏳ En cours'}
                                    </span>
                                    {session.quiz?.categories && (
                                        <span>
                                            {session.quiz.categories.icon} {session.quiz.categories.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attributions */}
            {data.assignments.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📋 Quiz attribués ({data.assignments.length})</h3>
                    <div style={styles.listContainer}>
                        {data.assignments.map(assignment => (
                            <div key={assignment.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>{assignment.quiz?.title || 'Quiz'}</strong>
                                    <span style={styles.listItemDate}>{formatDate(assignment.assigned_at)}</span>
                                </div>
                                <div style={styles.listItemStats}>
                                    <span>
                                        {assignment.is_completed ? '✅ Complété' : '⏳ À faire'}
                                    </span>
                                    {assignment.due_date && (
                                        <span>📅 Échéance: {formatDate(assignment.due_date)}</span>
                                    )}
                                    {assignment.assigneur && (
                                        <span>👤 Par: {assignment.assigneur.prenom} {assignment.assigneur.nom}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ModuleFormation({ statistiques, data }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>🎓 Module Formation</h2>

            {/* Statistiques */}
            <div style={styles.statsRow}>
                <StatCard icon="✅" label="Acquises" value={statistiques.competencesAcquises} />
                <StatCard icon="⏳" label="En cours" value={statistiques.competencesEnCours} />
                <StatCard icon="📝" label="À travailler" value={statistiques.competencesATravailler} />
                <StatCard icon="📈" label="Progression" value={`${statistiques.tauxProgressionCompetences}%`} />
            </div>

            {/* Plan actif */}
            {data.planActif && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📋 Plan de formation actif</h3>
                    <div style={styles.planCard}>
                        <p><strong>Objectif:</strong> {data.planActif.objectif_principal}</p>
                        <p><strong>Formateur:</strong> {data.planActif.formateur?.prenom} {data.planActif.formateur?.nom}</p>
                        <p><strong>Période:</strong> {formatDate(data.planActif.date_debut)} → {formatDate(data.planActif.date_fin_prevue)}</p>
                        <p><strong>Statut:</strong> {formatStatut(data.planActif.statut)}</p>
                    </div>
                </div>
            )}

            {/* Compétences */}
            {data.competencesPlan.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>🎯 Compétences ciblées ({data.competencesPlan.length})</h3>
                    <div style={styles.listContainer}>
                        {data.competencesPlan.map(comp => (
                            <div key={comp.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>
                                        {comp.competence?.code && `[${comp.competence.code}] `}
                                        {comp.competence?.intitule}
                                    </strong>
                                    <span style={{
                                        ...styles.statusBadge,
                                        backgroundColor: getCompetenceStatusColor(comp.statut)
                                    }}>
                                        {formatStatut(comp.statut)}
                                    </span>
                                </div>
                                {comp.competence?.categorie && (
                                    <p style={styles.listItemMeta}>
                                        {comp.competence.categorie.domaine?.emoji} {comp.competence.categorie.domaine?.nom} → {comp.competence.categorie.nom}
                                    </p>
                                )}
                                <div style={styles.listItemStats}>
                                    <span>Priorité: {comp.priorite === 1 ? '🔴 Haute' : comp.priorite === 2 ? '🟡 Moyenne' : '🟢 Basse'}</span>
                                    {comp.date_acquis && (
                                        <span>✅ Acquis le {formatDate(comp.date_acquis)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Exercices attribués */}
            {data.exercicesAttribues.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📝 Exercices attribués ({data.exercicesAttribues.length})</h3>
                    <div style={styles.listContainer}>
                        {data.exercicesAttribues.slice(0, 10).map(ex => (
                            <div key={ex.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>{ex.titre}</strong>
                                    <span style={{
                                        ...styles.statusBadge,
                                        backgroundColor: getExerciceStatusColor(ex.statut)
                                    }}>
                                        {formatStatut(ex.statut)}
                                    </span>
                                </div>
                                <p style={styles.listItemMeta}>Type: {ex.type_exercice}</p>
                                <div style={styles.listItemStats}>
                                    <span>📅 Attribué: {formatDate(ex.date_attribution)}</span>
                                    {ex.date_limite && (
                                        <span>⏰ Échéance: {formatDate(ex.date_limite)}</span>
                                    )}
                                    {ex.obligatoire && <span>⚠️ Obligatoire</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ModuleCodeRoute({ statistiques, data }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>📖 Code de la Route</h2>

            {/* Statistiques */}
            <div style={styles.statsRow}>
                <StatCard icon="📚" label="Mots travaillés" value={statistiques.nombreMotsTravailles} />
                <StatCard icon="✅" label="Mots maîtrisés" value={statistiques.motsMaitrises} />
                <StatCard icon="⏳" label="En cours" value={statistiques.motsEnCours} />
                <StatCard icon="📈" label="Taux maîtrise" value={`${statistiques.tauxMaitrise}%`} />
            </div>

            {/* Progression */}
            {data.progressionVocabulaire.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📚 Vocabulaire travaillé ({data.progressionVocabulaire.length})</h3>
                    <div style={styles.listContainer}>
                        {data.progressionVocabulaire.map(prog => (
                            <div key={prog.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>
                                        {prog.vocabulaire?.emoji} {prog.vocabulaire?.mot}
                                    </strong>
                                    <span style={{
                                        ...styles.statusBadge,
                                        backgroundColor: getVocabStatusColor(prog.statut)
                                    }}>
                                        {formatStatut(prog.statut)}
                                    </span>
                                </div>
                                <p style={styles.listItemMeta}>
                                    Catégorie: {prog.vocabulaire?.categorie}
                                </p>
                                <div style={styles.listItemStats}>
                                    <span>🔄 {prog.nombre_revisions} révisions</span>
                                    {prog.derniere_revision && (
                                        <span>📅 Dernière: {formatDate(prog.derniere_revision)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Définitions personnalisées */}
            {data.definitionsPersonnalisees.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>✏️ Définitions personnalisées ({data.definitionsPersonnalisees.length})</h3>
                    <div style={styles.listContainer}>
                        {data.definitionsPersonnalisees.map(def => (
                            <div key={def.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>{def.vocabulaire?.mot}</strong>
                                    <span style={styles.listItemDate}>{formatDate(def.date_creation)}</span>
                                </div>
                                {def.ma_definition && (
                                    <p style={styles.definitionText}>"{def.ma_definition}"</p>
                                )}
                                {def.mon_exemple && (
                                    <p style={styles.exempleText}>Exemple: {def.mon_exemple}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ModuleAssiduite({ statistiques, data }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>📅 Assiduité</h2>

            {/* Statistiques */}
            <div style={styles.statsRow}>
                <StatCard icon="📅" label="Créneaux planning" value={statistiques.nombreCreneauxPlanningType} />
                <StatCard icon="❌" label="Absences totales" value={statistiques.nombreAbsencesTotales} />
                <StatCard icon="📆" label="Périodes" value={statistiques.absencesPeriode} />
                <StatCard icon="📍" label="Ponctuelles" value={statistiques.absencesPonctuelles} />
            </div>

            {/* Planning type */}
            {data.planningType.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📅 Planning type ({data.planningType.length} créneaux)</h3>
                    <div style={styles.listContainer}>
                        {data.planningType.map(creneau => (
                            <div key={creneau.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>{creneau.jour} - {creneau.creneau}</strong>
                                    {creneau.lieu && (
                                        <span style={{
                                            ...styles.badge,
                                            backgroundColor: creneau.lieu.couleur || '#2196f3'
                                        }}>
                                            📍 {creneau.lieu.nom}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Absences */}
            {data.absences.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>❌ Absences enregistrées ({data.absences.length})</h3>
                    <div style={styles.listContainer}>
                        {data.absences.map(absence => (
                            <div key={absence.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>
                                        {absence.type === 'absence_periode' ? '📆 Période' :
                                         absence.type === 'absence_ponctuelle' ? '📍 Ponctuelle' :
                                         '✅ Présence exceptionnelle'}
                                    </strong>
                                    <span style={styles.listItemDate}>
                                        {absence.date_debut && formatDate(absence.date_debut)}
                                        {absence.date_fin && ` → ${formatDate(absence.date_fin)}`}
                                        {absence.date_specifique && formatDate(absence.date_specifique)}
                                    </span>
                                </div>
                                {absence.motif && (
                                    <p style={styles.listItemMeta}>Motif: {absence.motif}</p>
                                )}
                                {absence.creneau && (
                                    <p style={styles.listItemMeta}>Créneau: {absence.creneau}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ModuleSuivis({ data }) {
    return (
        <div style={styles.tabSection}>
            <h2 style={styles.sectionTitle}>📝 Suivis & Bilans</h2>

            {/* Suivis pédagogiques */}
            {data.suivis.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📝 Suivis pédagogiques ({data.suivis.length})</h3>
                    <div style={styles.listContainer}>
                        {data.suivis.map(suivi => (
                            <div key={suivi.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>
                                        {suivi.type === 'entretien' ? '💬 Entretien' :
                                         suivi.type === 'observation' ? '👁️ Observation' :
                                         '📊 Évaluation'}
                                    </strong>
                                    <span style={styles.listItemDate}>{formatDateTime(suivi.date_suivi)}</span>
                                </div>
                                {suivi.formateur && (
                                    <p style={styles.listItemMeta}>
                                        Formateur: {suivi.formateur.prenom} {suivi.formateur.nom}
                                    </p>
                                )}
                                {suivi.observations && (
                                    <p style={styles.suiviText}><strong>Observations:</strong> {suivi.observations}</p>
                                )}
                                {suivi.points_forts && (
                                    <p style={styles.suiviText}><strong>✅ Points forts:</strong> {suivi.points_forts}</p>
                                )}
                                {suivi.points_amelioration && (
                                    <p style={styles.suiviText}><strong>📈 À améliorer:</strong> {suivi.points_amelioration}</p>
                                )}
                                {suivi.actions_prevues && (
                                    <p style={styles.suiviText}><strong>🎯 Actions prévues:</strong> {suivi.actions_prevues}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bilans */}
            {data.bilans.length > 0 && (
                <div style={styles.subsection}>
                    <h3 style={styles.subsectionTitle}>📊 Bilans ({data.bilans.length})</h3>
                    <div style={styles.listContainer}>
                        {data.bilans.map(bilan => (
                            <div key={bilan.id} style={styles.listItem}>
                                <div style={styles.listItemHeader}>
                                    <strong>
                                        {bilan.type === 'intermediaire' ? '📊 Bilan intermédiaire' : '🎓 Bilan final'}
                                    </strong>
                                    <span style={styles.listItemDate}>{formatDate(bilan.date_bilan)}</span>
                                </div>
                                {bilan.formateur && (
                                    <p style={styles.listItemMeta}>
                                        Formateur: {bilan.formateur.prenom} {bilan.formateur.nom}
                                    </p>
                                )}
                                {bilan.periode_debut && bilan.periode_fin && (
                                    <p style={styles.listItemMeta}>
                                        Période: {formatDate(bilan.periode_debut)} → {formatDate(bilan.periode_fin)}
                                    </p>
                                )}
                                {bilan.synthese && (
                                    <p style={styles.bilanText}><strong>Synthèse:</strong> {bilan.synthese}</p>
                                )}
                                {bilan.recommandations && (
                                    <p style={styles.bilanText}><strong>Recommandations:</strong> {bilan.recommandations}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.suivis.length === 0 && data.bilans.length === 0 && (
                <p style={styles.emptyMessage}>Aucun suivi ou bilan enregistré pour le moment.</p>
            )}
        </div>
    )
}

// ============================================================================
// COMPOSANTS UTILITAIRES
// ============================================================================

function StatItem({ label, value }) {
    return (
        <div style={styles.statItem}>
            <span style={styles.statItemLabel}>{label}:</span>
            <span style={styles.statItemValue}>{value}</span>
        </div>
    )
}

function StatCard({ icon, label, value }) {
    return (
        <div style={styles.statCardSmall}>
            <div style={styles.statCardIcon}>{icon}</div>
            <div style={styles.statCardValue}>{value}</div>
            <div style={styles.statCardLabel}>{label}</div>
        </div>
    )
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function formatDate(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function formatStatut(statut) {
    const map = {
        'en_cours': 'En cours',
        'termine': 'Terminé',
        'valide': 'Validé',
        'abandonne': 'Abandonné',
        'suspendu': 'Suspendu',
        'a_travailler': 'À travailler',
        'acquis': 'Acquis',
        'attribue': 'Attribué',
        'commence': 'Commencé',
        'nouveau': 'Nouveau',
        'maitrise': 'Maîtrisé'
    }
    return map[statut] || statut
}

function getStatutIcon(statut) {
    const map = {
        'en_cours': '⏳',
        'termine': '✅',
        'valide': '✅',
        'abandonne': '❌',
        'suspendu': '⏸️'
    }
    return map[statut] || '📊'
}

function getStatutColor(statut) {
    const map = {
        'en_cours': '#2196f3',
        'termine': '#4caf50',
        'valide': '#4caf50',
        'abandonne': '#f44336',
        'suspendu': '#ff9800'
    }
    return map[statut] || '#9e9e9e'
}

function getCompetenceStatusColor(statut) {
    const map = {
        'acquis': '#4caf50',
        'en_cours': '#ff9800',
        'a_travailler': '#9e9e9e'
    }
    return map[statut] || '#9e9e9e'
}

function getExerciceStatusColor(statut) {
    const map = {
        'termine': '#4caf50',
        'commence': '#ff9800',
        'attribue': '#9e9e9e'
    }
    return map[statut] || '#9e9e9e'
}

function getVocabStatusColor(statut) {
    const map = {
        'maitrise': '#4caf50',
        'en_cours': '#ff9800',
        'nouveau': '#2196f3'
    }
    return map[statut] || '#9e9e9e'
}

// ============================================================================
// CONSTANTES
// ============================================================================

const TABS = [
    { id: 'vue-ensemble', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'lire', label: 'Module Lire', icon: '📚' },
    { id: 'quiz', label: 'Quiz', icon: '🎯' },
    { id: 'formation', label: 'Formation', icon: '🎓' },
    { id: 'code-route', label: 'Code Route', icon: '📖' },
    { id: 'assiduite', label: 'Assiduité', icon: '📅' },
    { id: 'suivis', label: 'Suivis & Bilans', icon: '📝' }
]

// ============================================================================
// STYLES
// ============================================================================

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh'
    },
    header: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        margin: 0
    },
    initiales: {
        fontSize: '20px',
        color: '#666',
        fontWeight: 'normal',
        marginLeft: '8px'
    },
    backButtonTop: {
        padding: '10px 20px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    headerInfo: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '16px'
    },
    infoBadge: {
        display: 'inline-block'
    },
    badge: {
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#fff',
        backgroundColor: '#2196f3'
    },
    headerDates: {
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap'
    },
    dateText: {
        fontSize: '14px',
        color: '#666',
        margin: 0
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
    },
    statCard: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    statIcon: {
        fontSize: '32px',
        marginBottom: '8px'
    },
    statValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#666'
    },
    tabsContainer: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    tabsHeader: {
        display: 'flex',
        borderBottom: '2px solid #e0e0e0',
        overflowX: 'auto'
    },
    tabButton: {
        padding: '16px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid transparent',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#666',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
    },
    tabButtonActive: {
        color: '#2196f3',
        borderBottomColor: '#2196f3',
        backgroundColor: '#f5f9ff'
    },
    tabContent: {
        padding: '24px'
    },
    tabSection: {
        minHeight: '400px'
    },
    sectionTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        marginTop: 0,
        marginBottom: '24px'
    },
    subsectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginTop: '32px',
        marginBottom: '16px'
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '32px'
    },
    statCardSmall: {
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
    },
    statCardIcon: {
        fontSize: '24px',
        marginBottom: '8px'
    },
    statCardValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: '4px'
    },
    statCardLabel: {
        fontSize: '12px',
        color: '#666'
    },
    overviewGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
    },
    overviewCard: {
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px'
    },
    overviewCardTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        marginTop: 0,
        marginBottom: '16px'
    },
    overviewStats: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    statItem: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px'
    },
    statItemLabel: {
        color: '#666'
    },
    statItemValue: {
        fontWeight: '600',
        color: '#333'
    },
    planInfo: {
        fontSize: '14px',
        lineHeight: '1.6'
    },
    subsection: {
        marginTop: '32px'
    },
    listContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    listItem: {
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px'
    },
    listItemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        gap: '12px'
    },
    listItemDate: {
        fontSize: '13px',
        color: '#999',
        whiteSpace: 'nowrap'
    },
    listItemMeta: {
        fontSize: '13px',
        color: '#666',
        margin: '4px 0'
    },
    listItemStats: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        fontSize: '13px',
        color: '#666',
        marginTop: '8px'
    },
    statusBadge: {
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#fff'
    },
    planCard: {
        backgroundColor: '#f5f9ff',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        padding: '16px',
        lineHeight: '1.8'
    },
    definitionText: {
        fontSize: '14px',
        fontStyle: 'italic',
        color: '#333',
        margin: '8px 0'
    },
    exempleText: {
        fontSize: '13px',
        color: '#666',
        margin: '4px 0'
    },
    suiviText: {
        fontSize: '14px',
        color: '#333',
        margin: '8px 0',
        lineHeight: '1.6'
    },
    bilanText: {
        fontSize: '14px',
        color: '#333',
        margin: '12px 0',
        lineHeight: '1.6'
    },
    emptyMessage: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '16px',
        color: '#999'
    },
    loadingBox: {
        padding: '80px 20px',
        textAlign: 'center',
        fontSize: '16px',
        color: '#666'
    },
    errorBox: {
        padding: '40px 20px',
        backgroundColor: '#ffebee',
        borderRadius: '8px',
        textAlign: 'center'
    },
    retryButton: {
        padding: '10px 20px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        marginTop: '12px'
    }
}
