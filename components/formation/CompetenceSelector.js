import { useState, useEffect } from 'react'

/**
 * Composant pour sélectionner manuellement des compétences
 * Recherche et filtrage par domaine/catégorie
 */
export default function CompetenceSelector({
    domaines = [],
    categories = [],
    competences = [],
    selectedCompetences = [],
    onSelect,
    onDeselect
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDomaine, setSelectedDomaine] = useState('tous')
    const [selectedCategorie, setSelectedCategorie] = useState('tous')
    const [filteredCompetences, setFilteredCompetences] = useState([])

    useEffect(() => {
        applyFilters()
    }, [searchTerm, selectedDomaine, selectedCategorie, competences])

    function applyFilters() {
        let filtered = [...competences]

        // Filtre par domaine
        if (selectedDomaine !== 'tous') {
            const catsInDomaine = categories
                .filter(cat => cat.domaine_id === selectedDomaine)
                .map(cat => cat.id)
            filtered = filtered.filter(comp => catsInDomaine.includes(comp.categorie_id))
        }

        // Filtre par catégorie
        if (selectedCategorie !== 'tous') {
            filtered = filtered.filter(comp => comp.categorie_id === selectedCategorie)
        }

        // Filtre par recherche
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(comp =>
                comp.intitule.toLowerCase().includes(term) ||
                (comp.description && comp.description.toLowerCase().includes(term))
            )
        }

        setFilteredCompetences(filtered)
    }

    function isSelected(competenceId) {
        return selectedCompetences.includes(competenceId)
    }

    function handleToggle(competenceId) {
        if (isSelected(competenceId)) {
            if (onDeselect) onDeselect(competenceId)
        } else {
            if (onSelect) onSelect(competenceId)
        }
    }

    // Filtrer les catégories selon le domaine sélectionné
    const categoriesFiltrees = selectedDomaine === 'tous'
        ? categories
        : categories.filter(cat => cat.domaine_id === selectedDomaine)

    return (
        <div style={styles.container}>
            <h4 style={styles.title}>Sélectionner des compétences</h4>

            {/* Filtres */}
            <div style={styles.filters}>
                {/* Recherche */}
                <input
                    type="text"
                    placeholder="Rechercher une compétence..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />

                {/* Filtre domaine */}
                <select
                    value={selectedDomaine}
                    onChange={(e) => {
                        setSelectedDomaine(e.target.value)
                        setSelectedCategorie('tous')
                    }}
                    style={styles.select}
                >
                    <option value="tous">Tous les domaines</option>
                    {domaines.map(domaine => (
                        <option key={domaine.id} value={domaine.id}>
                            {domaine.emoji} {domaine.nom}
                        </option>
                    ))}
                </select>

                {/* Filtre catégorie */}
                <select
                    value={selectedCategorie}
                    onChange={(e) => setSelectedCategorie(e.target.value)}
                    style={styles.select}
                    disabled={selectedDomaine === 'tous'}
                >
                    <option value="tous">Toutes les catégories</option>
                    {categoriesFiltrees.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.nom}
                        </option>
                    ))}
                </select>
            </div>

            {/* Compteur */}
            <div style={styles.counter}>
                <span style={styles.counterText}>
                    {selectedCompetences.length} compétence(s) sélectionnée(s)
                </span>
                <span style={styles.counterSubtext}>
                    {filteredCompetences.length} affichée(s)
                </span>
            </div>

            {/* Liste des compétences */}
            <div style={styles.list}>
                {filteredCompetences.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p>Aucune compétence trouvée</p>
                    </div>
                ) : (
                    filteredCompetences.map(competence => {
                        const selected = isSelected(competence.id)
                        const categorie = categories.find(cat => cat.id === competence.categorie_id)
                        const domaine = domaines.find(dom => dom.id === categorie?.domaine_id)

                        return (
                            <div
                                key={competence.id}
                                onClick={() => handleToggle(competence.id)}
                                style={{
                                    ...styles.competenceCard,
                                    ...(selected ? styles.competenceCardSelected : {})
                                }}
                            >
                                <div style={styles.checkbox}>
                                    {selected && '✓'}
                                </div>
                                <div style={styles.competenceContent}>
                                    <div style={styles.competenceHeader}>
                                        <span style={styles.competenceIntitule}>
                                            {competence.intitule}
                                        </span>
                                        {domaine && (
                                            <span style={styles.domaineBadge}>
                                                {domaine.emoji} {domaine.nom}
                                            </span>
                                        )}
                                    </div>
                                    {categorie && (
                                        <div style={styles.categorieName}>
                                            {categorie.nom}
                                        </div>
                                    )}
                                    {competence.description && (
                                        <div style={styles.competenceDescription}>
                                            {competence.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

const styles = {
    container: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
    },
    title: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 16px 0'
    },
    filters: {
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
    },
    searchInput: {
        flex: 1,
        minWidth: '200px',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px'
    },
    select: {
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: '#fff',
        cursor: 'pointer'
    },
    counter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '8px 12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px'
    },
    counterText: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#2196f3'
    },
    counterSubtext: {
        fontSize: '13px',
        color: '#666'
    },
    list: {
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #e8e8e8',
        borderRadius: '6px'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#999'
    },
    competenceCard: {
        display: 'flex',
        gap: '12px',
        padding: '12px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        ':hover': {
            backgroundColor: '#f9f9f9'
        }
    },
    competenceCardSelected: {
        backgroundColor: '#e3f2fd'
    },
    checkbox: {
        width: '24px',
        height: '24px',
        border: '2px solid #ddd',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#2196f3',
        fontWeight: 'bold',
        flexShrink: 0
    },
    competenceContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    competenceHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
    },
    competenceIntitule: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#333',
        flex: 1
    },
    domaineBadge: {
        fontSize: '11px',
        padding: '3px 8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        color: '#666',
        whiteSpace: 'nowrap'
    },
    categorieName: {
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
    },
    competenceDescription: {
        fontSize: '12px',
        color: '#888',
        lineHeight: '1.4'
    }
}
