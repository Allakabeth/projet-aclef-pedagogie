// Mappeur de voix pour personnaliser les noms des voix Web Speech API
export const getCustomVoiceName = (systemVoice) => {
    if (!systemVoice) return null;
    
    const voiceName = systemVoice.name.toLowerCase();
    const voiceLang = systemVoice.lang.toLowerCase();
    
    // Mapping personnalisé pour les voix françaises courantes (Paul et Julie)
    const voiceMapping = {
        // Chrome/Edge - voix françaises courantes
        'google français': 'Paul',
        'google français (france)': 'Paul', 
        'microsoft hortense': 'Julie',
        'microsoft hortense - french': 'Julie',
        'microsoft julie': 'Julie',
        'microsoft julie - french': 'Julie',
        'microsoft paul': 'Paul',
        'microsoft paul - french': 'Paul',
        'thomas': 'Paul',
        'thomas - french': 'Paul',
        'amelie': 'Julie',
        'amelie - french': 'Julie',
        
        // Safari - voix françaises macOS/iOS  
        'thomas (france)': 'Paul',
        'amelie (france)': 'Julie',
        'marie (france)': 'Julie',
        'thomas': 'Paul',
        'amelie': 'Julie',
        'marie': 'Julie',
        
        // Autres variantes possibles
        'fr-fr': 'Paul',
        'français': 'Paul',
        'french': 'Paul'
    };
    
    // Chercher une correspondance exacte
    for (const [systemName, customName] of Object.entries(voiceMapping)) {
        if (voiceName.includes(systemName)) {
            return customName;
        }
    }
    
    // Fallback basé sur le genre si détectable
    if (voiceName.includes('female') || voiceName.includes('femme') || 
        voiceName.includes('woman') || voiceName.includes('girl')) {
        return 'Julie';
    }
    
    if (voiceName.includes('male') || voiceName.includes('homme') || 
        voiceName.includes('man') || voiceName.includes('boy')) {
        return 'Paul';
    }
    
    // Fallback par défaut pour voix françaises
    if (voiceLang.startsWith('fr')) {
        return 'Paul'; // Voix masculine par défaut
    }
    
    return null; // Pas de mapping personnalisé disponible
};

// Fonction pour obtenir les voix françaises disponibles avec noms personnalisés
export const getFrenchVoicesWithCustomNames = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return [];
    }
    
    const voices = window.speechSynthesis.getVoices();
    const frenchVoices = voices.filter(voice => 
        voice.lang.startsWith('fr') || voice.name.toLowerCase().includes('french')
    );
    
    return frenchVoices.map(voice => ({
        systemVoice: voice,
        customName: getCustomVoiceName(voice) || voice.name,
        originalName: voice.name,
        lang: voice.lang,
        gender: voice.name.toLowerCase().includes('female') || 
               voice.name.toLowerCase().includes('woman') || 
               voice.name.toLowerCase().includes('girl') ||
               voice.name.toLowerCase().includes('hortense') ||
               voice.name.toLowerCase().includes('julie') ||
               voice.name.toLowerCase().includes('amelie') ||
               voice.name.toLowerCase().includes('marie') ? 'female' : 'male'
    }));
};

// Fonction pour sélectionner la meilleure voix française disponible
export const getBestFrenchVoice = (preferredGender = 'male') => {
    const frenchVoices = getFrenchVoicesWithCustomNames();
    
    if (frenchVoices.length === 0) {
        return null;
    }
    
    // Chercher d'abord par préférence de genre
    const voicesByGender = frenchVoices.filter(v => v.gender === preferredGender);
    if (voicesByGender.length > 0) {
        return voicesByGender[0].systemVoice;
    }
    
    // Sinon prendre la première voix française disponible
    return frenchVoices[0].systemVoice;
};