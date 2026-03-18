import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const TYPES_EXERCICES = [
    { value: 'fill_blank', label: 'Texte à trous', icon: '📝', desc: 'Phrase avec des blancs à compléter parmi des options' },
    { value: 'binary_choice', label: 'Choix en contexte', icon: '🔘', desc: 'Choisir la bonne forme dans la phrase (singulier/pluriel, homophones...)' },
    { value: 'ordering', label: 'Remettre en ordre', icon: '🔢', desc: 'Remettre des mots dans le bon ordre pour former une phrase' },
    { value: 'matching', label: 'Appariement', icon: '🔗', desc: 'Relier des paires (contraires, masculin/féminin, synonymes...)' },
    { value: 'classification', label: 'Classification', icon: '📂', desc: 'Trier des mots dans des catégories' },
    { value: 'transformation', label: 'Transformation', icon: '🔄', desc: 'Transformer une phrase en suivant un modèle' }
]

const THEMES = [
    { value: 'articles_definis', label: 'Articles définis' },
    { value: 'articles_indefinis', label: 'Articles indéfinis' },
    { value: 'possessifs', label: 'Possessifs' },
    { value: 'demonstratifs', label: 'Démonstratifs' },
    { value: 'pronoms', label: 'Pronoms personnels' },
    { value: 'singulier_pluriel', label: 'Singulier / Pluriel' },
    { value: 'masculin_feminin', label: 'Masculin / Féminin' },
    { value: 'accords_adjectifs', label: 'Accords des adjectifs' },
    { value: 'homophones_a', label: 'Homophones a/à' },
    { value: 'homophones_on_ont', label: 'Homophones on/ont' },
    { value: 'homophones_et_est', label: 'Homophones et/est' },
    { value: 'homophones_son_sont', label: 'Homophones son/sont, ou/où' },
    { value: 'contraires_synonymes', label: 'Contraires et synonymes' },
    { value: 'familles_mots', label: 'Familles de mots' },
    { value: 'conjonctions', label: 'Conjonctions (mais/et/ou)' },
    { value: 'negation', label: 'Négation' },
    { value: 'construction_phrases', label: 'Construction de phrases' },
    { value: 'conjugaison_present', label: 'Conjugaison présent' },
    { value: 'conjugaison_passe', label: 'Conjugaison passé composé' },
    { value: 'conjugaison_imparfait_futur', label: 'Conjugaison imparfait/futur' }
]

// Contenu par défaut selon le type
function getDefaultContenu(type) {
    switch (type) {
        case 'fill_blank':
            return { options: [''], phrases: [{ avant: '', apres: '', reponse: '' }] }
        case 'binary_choice':
            return { phrases: [{ segments: [{ type: 'text', value: '' }, { type: 'choice', options: ['', ''], correct: '' }, { type: 'text', value: '' }] }] }
        case 'ordering':
            return { phrases: [{ mots: ['', '', ''], ordre_correct: [0, 1, 2] }] }
        case 'matching':
            return { pairs: [{ left: '', right: '' }] }
        case 'classification':
            return { categories: ['', ''], items: [{ text: '', categorie: '' }] }
        case 'transformation':
            return { modele: { avant: '', apres: '' }, phrases: [{ originale: '', reponse: '' }] }
        default:
            return {}
    }
}

export default function NouvelExerciceOrthographe() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [competences, setCompetences] = useState([])

    // Métadonnées (step 1)
    const [form, setForm] = useState({
        theme_grammatical: '',
        sous_theme: '',
        type: '',
        titre: '',
        consigne: '',
        niveau: 'A',
        numero_boite: '',
        difficulte: 'moyen',
        competence_id: ''
    })

    // Contenu (step 2)
    const [contenu, setContenu] = useState({})

    useEffect(() => {
        loadCompetences()
    }, [])

    async function loadCompetences() {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const res = await fetch('/api/admin/formation/competences', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                // Filtrer les compétences ECR-OG (orthographe grammaticale)
                const orthoComps = (data.competences || data || []).filter(c =>
                    c.code && c.code.startsWith('ECR-OG')
                )
                setCompetences(orthoComps)
            }
        } catch (err) {
            console.error('Erreur chargement compétences:', err)
        }
    }

    function handleNext() {
        if (!form.theme_grammatical || !form.type || !form.titre) {
            alert('Veuillez remplir le thème, le type et le titre')
            return
        }
        setContenu(getDefaultContenu(form.type))
        setStep(2)
    }

    async function handleSave() {
        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            const body = {
                ...form,
                numero_boite: form.numero_boite ? parseInt(form.numero_boite) : null,
                competence_id: form.competence_id || null,
                contenu
            }

            const res = await fetch('/api/admin/ecrire/orthographe/exercices', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erreur lors de la sauvegarde')
            }

            alert('Exercice créé avec succès !')
            router.push('/admin/ecrire/orthographe')
        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // ============================================================
    // ÉDITEURS DE CONTENU PAR TYPE
    // ============================================================

    function renderFillBlankEditor() {
        const c = contenu
        return (
            <div>
                <h3 style={styles.sectionTitle}>Options proposées</h3>
                <div style={styles.optionsRow}>
                    {(c.options || []).map((opt, i) => (
                        <div key={i} style={styles.optionItem}>
                            <input
                                value={opt}
                                onChange={(e) => {
                                    const opts = [...c.options]
                                    opts[i] = e.target.value
                                    setContenu({ ...c, options: opts })
                                }}
                                placeholder={`Option ${i + 1}`}
                                style={styles.input}
                            />
                            {c.options.length > 1 && (
                                <button onClick={() => {
                                    const opts = c.options.filter((_, j) => j !== i)
                                    setContenu({ ...c, options: opts })
                                }} style={styles.removeBtn}>x</button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => setContenu({ ...c, options: [...c.options, ''] })} style={styles.addBtn}>
                        + Option
                    </button>
                </div>

                <h3 style={styles.sectionTitle}>Phrases à trous</h3>
                {(c.phrases || []).map((phrase, i) => (
                    <div key={i} style={styles.phraseRow}>
                        <span style={styles.phraseNum}>{i + 1}.</span>
                        <input value={phrase.avant} onChange={(e) => {
                            const p = [...c.phrases]; p[i] = { ...p[i], avant: e.target.value }
                            setContenu({ ...c, phrases: p })
                        }} placeholder="Texte avant le trou" style={{ ...styles.input, flex: 2 }} />
                        <span style={styles.trou}>[ ... ]</span>
                        <input value={phrase.apres} onChange={(e) => {
                            const p = [...c.phrases]; p[i] = { ...p[i], apres: e.target.value }
                            setContenu({ ...c, phrases: p })
                        }} placeholder="Texte après le trou" style={{ ...styles.input, flex: 2 }} />
                        <select value={phrase.reponse} onChange={(e) => {
                            const p = [...c.phrases]; p[i] = { ...p[i], reponse: e.target.value }
                            setContenu({ ...c, phrases: p })
                        }} style={styles.select}>
                            <option value="">Réponse</option>
                            {(c.options || []).filter(o => o).map(o => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                        {c.phrases.length > 1 && (
                            <button onClick={() => {
                                setContenu({ ...c, phrases: c.phrases.filter((_, j) => j !== i) })
                            }} style={styles.removeBtn}>x</button>
                        )}
                    </div>
                ))}
                <button onClick={() => {
                    setContenu({ ...c, phrases: [...c.phrases, { avant: '', apres: '', reponse: '' }] })
                }} style={styles.addBtn}>+ Phrase</button>
            </div>
        )
    }

    function renderBinaryChoiceEditor() {
        const c = contenu
        return (
            <div>
                <h3 style={styles.sectionTitle}>Phrases avec choix</h3>
                {(c.phrases || []).map((phrase, pi) => (
                    <div key={pi} style={styles.phraseBlock}>
                        <div style={styles.phraseBlockHeader}>
                            <span style={styles.phraseNum}>Phrase {pi + 1}</span>
                            {c.phrases.length > 1 && (
                                <button onClick={() => {
                                    setContenu({ ...c, phrases: c.phrases.filter((_, j) => j !== pi) })
                                }} style={styles.removeBtn}>Supprimer</button>
                            )}
                        </div>
                        {(phrase.segments || []).map((seg, si) => (
                            <div key={si} style={styles.segmentRow}>
                                {seg.type === 'text' ? (
                                    <input value={seg.value} onChange={(e) => {
                                        const p = [...c.phrases]
                                        p[pi].segments[si] = { ...seg, value: e.target.value }
                                        setContenu({ ...c, phrases: p })
                                    }} placeholder="Texte..." style={{ ...styles.input, flex: 1 }} />
                                ) : (
                                    <div style={styles.choiceEditor}>
                                        <span style={styles.choiceLabel}>Choix :</span>
                                        {(seg.options || []).map((opt, oi) => (
                                            <input key={oi} value={opt} onChange={(e) => {
                                                const p = [...c.phrases]
                                                const opts = [...seg.options]
                                                opts[oi] = e.target.value
                                                p[pi].segments[si] = { ...seg, options: opts }
                                                setContenu({ ...c, phrases: p })
                                            }} placeholder={`Option ${oi + 1}`} style={styles.inputSmall} />
                                        ))}
                                        <span style={styles.choiceLabel}>Correct :</span>
                                        <select value={seg.correct} onChange={(e) => {
                                            const p = [...c.phrases]
                                            p[pi].segments[si] = { ...seg, correct: e.target.value }
                                            setContenu({ ...c, phrases: p })
                                        }} style={styles.selectSmall}>
                                            <option value="">?</option>
                                            {(seg.options || []).filter(o => o).map(o => (
                                                <option key={o} value={o}>{o}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
                <button onClick={() => {
                    setContenu({
                        ...c,
                        phrases: [...c.phrases, {
                            segments: [
                                { type: 'text', value: '' },
                                { type: 'choice', options: ['', ''], correct: '' },
                                { type: 'text', value: '' }
                            ]
                        }]
                    })
                }} style={styles.addBtn}>+ Phrase</button>
            </div>
        )
    }

    function renderMatchingEditor() {
        const c = contenu
        return (
            <div>
                <h3 style={styles.sectionTitle}>Paires à associer</h3>
                {(c.pairs || []).map((pair, i) => (
                    <div key={i} style={styles.pairRow}>
                        <input value={pair.left} onChange={(e) => {
                            const p = [...c.pairs]; p[i] = { ...p[i], left: e.target.value }
                            setContenu({ ...c, pairs: p })
                        }} placeholder="Gauche" style={{ ...styles.input, flex: 1 }} />
                        <span style={styles.arrow}>→</span>
                        <input value={pair.right} onChange={(e) => {
                            const p = [...c.pairs]; p[i] = { ...p[i], right: e.target.value }
                            setContenu({ ...c, pairs: p })
                        }} placeholder="Droite" style={{ ...styles.input, flex: 1 }} />
                        {c.pairs.length > 1 && (
                            <button onClick={() => {
                                setContenu({ ...c, pairs: c.pairs.filter((_, j) => j !== i) })
                            }} style={styles.removeBtn}>x</button>
                        )}
                    </div>
                ))}
                <button onClick={() => {
                    setContenu({ ...c, pairs: [...c.pairs, { left: '', right: '' }] })
                }} style={styles.addBtn}>+ Paire</button>
            </div>
        )
    }

    function renderOrderingEditor() {
        const c = contenu
        return (
            <div>
                <h3 style={styles.sectionTitle}>Phrases à remettre en ordre</h3>
                <p style={styles.hint}>Saisissez les mots dans le BON ordre. Ils seront mélangés pour l'apprenant.</p>
                {(c.phrases || []).map((phrase, pi) => (
                    <div key={pi} style={styles.phraseBlock}>
                        <span style={styles.phraseNum}>Phrase {pi + 1}</span>
                        <div style={styles.motsRow}>
                            {(phrase.mots || []).map((mot, mi) => (
                                <input key={mi} value={mot} onChange={(e) => {
                                    const p = [...c.phrases]
                                    const mots = [...p[pi].mots]
                                    mots[mi] = e.target.value
                                    p[pi] = { ...p[pi], mots, ordre_correct: mots.map((_, i) => i) }
                                    setContenu({ ...c, phrases: p })
                                }} placeholder={`Mot ${mi + 1}`} style={styles.inputSmall} />
                            ))}
                            <button onClick={() => {
                                const p = [...c.phrases]
                                p[pi] = { ...p[pi], mots: [...p[pi].mots, ''], ordre_correct: [...p[pi].mots, ''].map((_, i) => i) }
                                setContenu({ ...c, phrases: p })
                            }} style={styles.addBtnSmall}>+</button>
                        </div>
                    </div>
                ))}
                <button onClick={() => {
                    setContenu({ ...c, phrases: [...c.phrases, { mots: ['', '', ''], ordre_correct: [0, 1, 2] }] })
                }} style={styles.addBtn}>+ Phrase</button>
            </div>
        )
    }

    function renderClassificationEditor() {
        const c = contenu
        return (
            <div>
                <h3 style={styles.sectionTitle}>Catégories</h3>
                <div style={styles.optionsRow}>
                    {(c.categories || []).map((cat, i) => (
                        <div key={i} style={styles.optionItem}>
                            <input value={cat} onChange={(e) => {
                                const cats = [...c.categories]; cats[i] = e.target.value
                                setContenu({ ...c, categories: cats })
                            }} placeholder={`Catégorie ${i + 1}`} style={styles.input} />
                        </div>
                    ))}
                    <button onClick={() => setContenu({ ...c, categories: [...c.categories, ''] })} style={styles.addBtn}>
                        + Catégorie
                    </button>
                </div>

                <h3 style={styles.sectionTitle}>Éléments à classer</h3>
                {(c.items || []).map((item, i) => (
                    <div key={i} style={styles.pairRow}>
                        <input value={item.text} onChange={(e) => {
                            const items = [...c.items]; items[i] = { ...items[i], text: e.target.value }
                            setContenu({ ...c, items })
                        }} placeholder="Mot/expression" style={{ ...styles.input, flex: 1 }} />
                        <span style={styles.arrow}>→</span>
                        <select value={item.categorie} onChange={(e) => {
                            const items = [...c.items]; items[i] = { ...items[i], categorie: e.target.value }
                            setContenu({ ...c, items })
                        }} style={styles.select}>
                            <option value="">Catégorie ?</option>
                            {(c.categories || []).filter(cat => cat).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {c.items.length > 1 && (
                            <button onClick={() => {
                                setContenu({ ...c, items: c.items.filter((_, j) => j !== i) })
                            }} style={styles.removeBtn}>x</button>
                        )}
                    </div>
                ))}
                <button onClick={() => {
                    setContenu({ ...c, items: [...c.items, { text: '', categorie: '' }] })
                }} style={styles.addBtn}>+ Élément</button>
            </div>
        )
    }

    function renderTransformationEditor() {
        const c = contenu
        return (
            <div>
                <h3 style={styles.sectionTitle}>Modèle (exemple montré à l'apprenant)</h3>
                <div style={styles.pairRow}>
                    <input value={c.modele?.avant || ''} onChange={(e) => {
                        setContenu({ ...c, modele: { ...c.modele, avant: e.target.value } })
                    }} placeholder="Phrase originale" style={{ ...styles.input, flex: 1 }} />
                    <span style={styles.arrow}>→</span>
                    <input value={c.modele?.apres || ''} onChange={(e) => {
                        setContenu({ ...c, modele: { ...c.modele, apres: e.target.value } })
                    }} placeholder="Phrase transformée" style={{ ...styles.input, flex: 1 }} />
                </div>

                <h3 style={styles.sectionTitle}>Phrases à transformer</h3>
                {(c.phrases || []).map((phrase, i) => (
                    <div key={i} style={styles.pairRow}>
                        <input value={phrase.originale} onChange={(e) => {
                            const p = [...c.phrases]; p[i] = { ...p[i], originale: e.target.value }
                            setContenu({ ...c, phrases: p })
                        }} placeholder="Phrase originale" style={{ ...styles.input, flex: 1 }} />
                        <span style={styles.arrow}>→</span>
                        <input value={phrase.reponse} onChange={(e) => {
                            const p = [...c.phrases]; p[i] = { ...p[i], reponse: e.target.value }
                            setContenu({ ...c, phrases: p })
                        }} placeholder="Réponse attendue" style={{ ...styles.input, flex: 1 }} />
                        {c.phrases.length > 1 && (
                            <button onClick={() => {
                                setContenu({ ...c, phrases: c.phrases.filter((_, j) => j !== i) })
                            }} style={styles.removeBtn}>x</button>
                        )}
                    </div>
                ))}
                <button onClick={() => {
                    setContenu({ ...c, phrases: [...c.phrases, { originale: '', reponse: '' }] })
                }} style={styles.addBtn}>+ Phrase</button>
            </div>
        )
    }

    function renderContenuEditor() {
        switch (form.type) {
            case 'fill_blank': return renderFillBlankEditor()
            case 'binary_choice': return renderBinaryChoiceEditor()
            case 'ordering': return renderOrderingEditor()
            case 'matching': return renderMatchingEditor()
            case 'classification': return renderClassificationEditor()
            case 'transformation': return renderTransformationEditor()
            default: return <p>Sélectionnez un type d'exercice</p>
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    {step === 1 ? '1/2 - Informations' : '2/2 - Contenu'}
                </h1>
                <button onClick={() => step === 1 ? router.push('/admin/ecrire/orthographe') : setStep(1)} style={styles.backButton}>
                    ← {step === 1 ? 'Retour' : 'Étape 1'}
                </button>
            </div>

            {step === 1 ? (
                <div style={styles.formCard}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Type d'exercice *</label>
                        <div style={styles.typeGrid}>
                            {TYPES_EXERCICES.map(t => (
                                <button key={t.value}
                                    onClick={() => setForm({ ...form, type: t.value })}
                                    style={{
                                        ...styles.typeBtn,
                                        ...(form.type === t.value ? styles.typeBtnActive : {})
                                    }}
                                >
                                    <span style={{ fontSize: '24px' }}>{t.icon}</span>
                                    <strong>{t.label}</strong>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>{t.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Thème grammatical *</label>
                            <select value={form.theme_grammatical} onChange={(e) => setForm({ ...form, theme_grammatical: e.target.value })} style={styles.input}>
                                <option value="">Choisir...</option>
                                {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Sous-thème</label>
                            <input value={form.sous_theme} onChange={(e) => setForm({ ...form, sous_theme: e.target.value })} placeholder="ex: mon_ma_mes" style={styles.input} />
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Titre *</label>
                        <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="ex: Possessifs mon/ma/mes - Exercice 1" style={styles.input} />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Consigne</label>
                        <input value={form.consigne} onChange={(e) => setForm({ ...form, consigne: e.target.value })} placeholder="ex: Complète avec mon, ma ou mes" style={styles.input} />
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Niveau</label>
                            <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} style={styles.input}>
                                <option value="A">A (bases)</option>
                                <option value="B">B (intermédiaire)</option>
                                <option value="C">C (avancé)</option>
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Difficulté</label>
                            <select value={form.difficulte} onChange={(e) => setForm({ ...form, difficulte: e.target.value })} style={styles.input}>
                                <option value="facile">Facile</option>
                                <option value="moyen">Moyen</option>
                                <option value="difficile">Difficile</option>
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>N° boîte originale</label>
                            <input type="number" value={form.numero_boite} onChange={(e) => setForm({ ...form, numero_boite: e.target.value })} placeholder="1-400" style={styles.input} />
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Compétence liée</label>
                        <select value={form.competence_id} onChange={(e) => setForm({ ...form, competence_id: e.target.value })} style={styles.input}>
                            <option value="">Aucune</option>
                            {competences.map(c => (
                                <option key={c.id} value={c.id}>{c.code} - {c.intitule}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '20px' }}>
                        <button onClick={handleNext} style={styles.nextBtn}>
                            Étape suivante : Contenu →
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.formCard}>
                    <div style={styles.infoBanner}>
                        <strong>{TYPES_EXERCICES.find(t => t.value === form.type)?.icon} {form.titre}</strong>
                        <span style={{ color: '#64748b' }}> | {form.theme_grammatical} | Niveau {form.niveau}</span>
                    </div>

                    {renderContenuEditor()}

                    <div style={{ textAlign: 'right', marginTop: '30px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setStep(1)} style={styles.backButton}>← Modifier les infos</button>
                        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                            {saving ? 'Enregistrement...' : 'Enregistrer l\'exercice'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', fontFamily: 'Arial', maxWidth: '1000px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    formCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    formGroup: { marginBottom: '20px', flex: 1 },
    formRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    inputSmall: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', width: '120px' },
    select: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff' },
    selectSmall: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' },
    typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
    typeBtn: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', border: '2px solid #e5e7eb', borderRadius: '10px', backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
    typeBtnActive: { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' },
    nextBtn: { padding: '12px 30px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
    saveBtn: { padding: '12px 30px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
    infoBanner: { padding: '12px 16px', backgroundColor: '#f5f3ff', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' },
    sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#374151', margin: '24px 0 12px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' },
    hint: { fontSize: '13px', color: '#94a3b8', marginBottom: '12px' },
    optionsRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' },
    optionItem: { display: 'flex', gap: '4px', alignItems: 'center' },
    phraseRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' },
    phraseBlock: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' },
    phraseBlockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    phraseNum: { fontWeight: '600', color: '#8b5cf6', fontSize: '14px' },
    trou: { color: '#8b5cf6', fontWeight: 'bold', fontSize: '16px', padding: '0 4px' },
    pairRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' },
    arrow: { fontSize: '18px', color: '#8b5cf6' },
    motsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
    segmentRow: { marginBottom: '8px' },
    choiceEditor: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '8px', backgroundColor: '#ede9fe', borderRadius: '6px' },
    choiceLabel: { fontSize: '12px', fontWeight: '600', color: '#7c3aed' },
    addBtn: { padding: '8px 16px', backgroundColor: '#f5f3ff', color: '#8b5cf6', border: '1px solid #c4b5fd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    addBtnSmall: { padding: '6px 12px', backgroundColor: '#f5f3ff', color: '#8b5cf6', border: '1px solid #c4b5fd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    removeBtn: { padding: '4px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
}
