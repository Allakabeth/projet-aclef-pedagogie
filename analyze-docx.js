const mammoth = require('mammoth')
const fs = require('fs')

async function analyzeDocx() {
    try {
        const buffer = fs.readFileSync('C:\\Projet ACLEF\\projet-aclef-pédagogie\\Regretter.docx')
        const result = await mammoth.extractRawText({ buffer })
        const text = result.value
        
        console.log('=== TEXTE COMPLET ===')
        console.log(text)
        console.log('\n=== ANALYSE DES LIGNES ===')
        
        const lines = text.split(/\r?\n/)
        lines.forEach((line, index) => {
            if (line.trim() === '') {
                console.log(`Ligne ${index + 1}: [LIGNE VIDE - SAUT DE LIGNE]`)
            } else {
                console.log(`Ligne ${index + 1}: "${line.trim()}"`)
            }
        })
        
    } catch (error) {
        console.error('Erreur:', error.message)
    }
}

analyzeDocx()