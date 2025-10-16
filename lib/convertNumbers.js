// Conversion des nombres en lettres (français)
const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']

function convertNumberToWords(num) {
    if (num === 0) return 'zéro'
    if (num < 0) return 'moins ' + convertNumberToWords(-num)
    
    if (num < 10) {
        return unites[num]
    }
    
    if (num < 20) {
        return teens[num - 10]
    }
    
    if (num < 100) {
        const dizaine = Math.floor(num / 10)
        const unite = num % 10
        
        if (dizaine === 7) {
            if (unite === 1) return 'soixante et onze'
            if (unite === 0) return 'soixante-dix'
            return 'soixante-' + teens[unite]
        }
        
        if (dizaine === 9) {
            if (unite === 0) return 'quatre-vingt-dix'
            return 'quatre-vingt-' + teens[unite]
        }
        
        if (dizaine === 8) {
            if (unite === 0) return 'quatre-vingts'
            return 'quatre-vingt-' + unites[unite]
        }
        
        if (unite === 0) {
            return dizaines[dizaine]
        }
        
        if (unite === 1 && (dizaine === 2 || dizaine === 3 || dizaine === 4 || dizaine === 5 || dizaine === 6)) {
            return dizaines[dizaine] + ' et un'
        }
        
        return dizaines[dizaine] + '-' + unites[unite]
    }
    
    if (num < 1000) {
        const centaine = Math.floor(num / 100)
        const reste = num % 100
        
        let result = ''
        if (centaine === 1) {
            result = reste === 0 ? 'cent' : 'cent '
        } else {
            result = unites[centaine] + ' cent'
            if (reste === 0) result += 's'
            else result += ' '
        }
        
        if (reste > 0) {
            result += convertNumberToWords(reste)
        }
        
        return result
    }
    
    if (num < 1000000) {
        const millier = Math.floor(num / 1000)
        const reste = num % 1000
        
        let result = ''
        if (millier === 1) {
            result = 'mille'
        } else {
            result = convertNumberToWords(millier) + ' mille'
        }
        
        if (reste > 0) {
            result += ' ' + convertNumberToWords(reste)
        }
        
        return result
    }
    
    // Pour les nombres plus grands, on peut étendre si nécessaire
    return num.toString() // Fallback pour les très grands nombres
}

export function convertNumbersInText(text) {
    // Conservation des nombres originaux (ne plus convertir en lettres)
    // Les nombres comme "21", "09/10/2004" restent tels quels
    return text
}

export function capitalizeText(text) {
    if (!text) return text
    
    // Capitaliser le début du texte
    let result = text.charAt(0).toUpperCase() + text.slice(1)
    
    // Capitaliser après ponctuation forte (., !, ?) suivie d'espaces
    result = result.replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
        return punctuation + letter.toUpperCase()
    })
    
    return result
}