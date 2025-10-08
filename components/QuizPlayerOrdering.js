import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AudioButton from './AudioButton'

export default function QuizPlayerOrdering({ quiz, onComplete }) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userOrder, setUserOrder] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [score, setScore] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // States pour le touch drag mobile
  const [touchStartY, setTouchStartY] = useState(null)
  const [touchCurrentY, setTouchCurrentY] = useState(null)
  const [touchDraggedItem, setTouchDraggedItem] = useState(null)
  const [touchDraggedIndex, setTouchDraggedIndex] = useState(null)

  const currentQuestion = quiz.quiz_data?.questions?.[currentQuestionIndex]

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculer la taille des éléments pour qu'ils remplissent TOUT l'écran
  const getItemHeight = () => {
    const itemCount = userOrder.length
    if (itemCount === 0) return '50px'

    if (isMobile) {
      // Mobile : calcul dynamique pour remplir l'écran
      const screenHeight = window.innerHeight
      const headerHeight = 40 // Header + margin
      const buttonHeight = 50 // Bouton valider + margin
      const padding = 20 // Padding container

      const availableHeight = screenHeight - headerHeight - buttonHeight - padding
      const totalMargins = (itemCount - 1) * 4 // 4px entre chaque item
      const itemHeight = (availableHeight - totalMargins) / itemCount

      // Min 30px, max 80px
      const finalHeight = Math.max(30, Math.min(80, itemHeight))
      return `${Math.floor(finalHeight)}px`
    } else {
      // PC : hauteur adaptative avec clamp
      if (itemCount <= 4) return 'clamp(60px, 8vh, 90px)'
      if (itemCount <= 6) return 'clamp(50px, 7vh, 75px)'
      if (itemCount <= 8) return 'clamp(45px, 6vh, 65px)'
      if (itemCount <= 10) return 'clamp(40px, 5vh, 58px)'
      if (itemCount <= 12) return 'clamp(36px, 4.5vh, 52px)'
      return 'clamp(32px, 4vh, 48px)'
    }
  }

  const getMarginBottom = () => {
    if (isMobile) {
      return '4px' // Fixe pour calcul précis
    } else {
      const itemCount = userOrder.length
      if (itemCount <= 6) return 'clamp(6px, 0.8vh, 8px)'
      if (itemCount <= 10) return 'clamp(4px, 0.6vh, 6px)'
      return 'clamp(3px, 0.4vh, 5px)'
    }
  }

  const getFontSize = () => {
    const itemCount = userOrder.length
    if (isMobile) {
      // Adapter la taille de police à la hauteur de l'item
      const heightPx = parseInt(getItemHeight())
      if (heightPx >= 70) return '20px'
      if (heightPx >= 60) return '18px'
      if (heightPx >= 50) return '16px'
      if (heightPx >= 40) return '15px'
      return '14px'
    } else {
      if (itemCount <= 6) return 'clamp(22px, 2.4vw, 28px)'
      if (itemCount <= 10) return 'clamp(20px, 2.2vw, 26px)'
      if (itemCount <= 12) return 'clamp(18px, 2vw, 24px)'
      return 'clamp(16px, 1.8vw, 22px)'
    }
  }

  const getPadding = () => {
    const itemCount = userOrder.length
    if (isMobile) {
      // Adapter le padding à la hauteur
      const heightPx = parseInt(getItemHeight())
      if (heightPx >= 60) return '12px'
      if (heightPx >= 45) return '10px'
      return '8px'
    } else {
      if (itemCount <= 6) return 'clamp(12px, 1.2vh, 15px)'
      if (itemCount <= 10) return 'clamp(10px, 1vh, 12px)'
      return 'clamp(8px, 0.8vh, 10px)'
    }
  }

  const getBadgeSize = () => {
    const itemCount = userOrder.length
    if (isMobile) {
      // Adapter le badge à la hauteur
      const heightPx = parseInt(getItemHeight())
      if (heightPx >= 60) return '36px'
      if (heightPx >= 50) return '32px'
      if (heightPx >= 40) return '28px'
      return '24px'
    } else {
      if (itemCount <= 6) return 'clamp(42px, 5vh, 50px)'
      if (itemCount <= 10) return 'clamp(38px, 4.5vh, 46px)'
      if (itemCount <= 12) return 'clamp(34px, 4vh, 42px)'
      return 'clamp(30px, 3.5vh, 38px)'
    }
  }

  const getBadgeFontSize = () => {
    const itemCount = userOrder.length
    if (isMobile) {
      // Adapter la police du badge
      const heightPx = parseInt(getItemHeight())
      if (heightPx >= 60) return '16px'
      if (heightPx >= 50) return '15px'
      if (heightPx >= 40) return '14px'
      return '12px'
    } else {
      if (itemCount <= 6) return 'clamp(18px, 2vh, 22px)'
      if (itemCount <= 10) return 'clamp(17px, 1.9vh, 21px)'
      if (itemCount <= 12) return 'clamp(16px, 1.8vh, 20px)'
      return 'clamp(15px, 1.7vh, 19px)'
    }
  }

  useEffect(() => {
    if (currentQuestion?.items) {
      // Mélanger les items au début
      const shuffled = [...currentQuestion.items]
        .map(item => ({ ...item, shuffleId: Math.random() }))
        .sort((a, b) => a.shuffleId - b.shuffleId)
      setUserOrder(shuffled)
    }
  }, [currentQuestionIndex, currentQuestion])

  const handleDragStart = (e, item) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetItem) => {
    e.preventDefault()

    if (!draggedItem) return

    const draggedIndex = userOrder.findIndex(item => item.id === draggedItem.id)
    const targetIndex = userOrder.findIndex(item => item.id === targetItem.id)

    if (draggedIndex === targetIndex) return

    const newOrder = [...userOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    setUserOrder(newOrder)
    setDraggedItem(null)
  }

  const moveUp = (index) => {
    if (index === 0) return
    const newOrder = [...userOrder]
    const temp = newOrder[index - 1]
    newOrder[index - 1] = newOrder[index]
    newOrder[index] = temp
    setUserOrder(newOrder)
  }

  const moveDown = (index) => {
    if (index === userOrder.length - 1) return
    const newOrder = [...userOrder]
    const temp = newOrder[index + 1]
    newOrder[index + 1] = newOrder[index]
    newOrder[index] = temp
    setUserOrder(newOrder)
  }

  // Handlers pour le touch drag mobile - Réorganisation en temps réel
  const handleTouchStart = (e, item, index) => {
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    setTouchCurrentY(touch.clientY)
    setTouchDraggedItem(item)
    setTouchDraggedIndex(index)
  }

  const handleTouchMove = (e) => {
    if (touchDraggedItem === null || touchDraggedIndex === null) return

    const touch = e.touches[0]
    setTouchCurrentY(touch.clientY)

    // Empêcher le scroll pendant le drag
    e.preventDefault()

    // Détecter l'élément sous le doigt
    const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!elementAtPoint) return

    // Trouver l'index de l'item cible
    let currentElement = elementAtPoint
    let targetIndex = null

    while (currentElement && targetIndex === null) {
      const dataIndex = currentElement.getAttribute('data-item-index')
      if (dataIndex !== null) {
        targetIndex = parseInt(dataIndex)
        break
      }
      currentElement = currentElement.parentElement
    }

    // Réorganiser en temps réel si changement détecté
    if (targetIndex !== null && targetIndex !== touchDraggedIndex) {
      const newOrder = [...userOrder]
      const draggedItem = newOrder[touchDraggedIndex]

      // Retirer l'item de sa position actuelle
      newOrder.splice(touchDraggedIndex, 1)
      // L'insérer à la nouvelle position
      newOrder.splice(targetIndex, 0, draggedItem)

      setUserOrder(newOrder)
      setTouchDraggedIndex(targetIndex)
    }
  }

  const handleTouchEnd = (e) => {
    if (touchDraggedItem === null) return

    // Reset des states
    setTouchStartY(null)
    setTouchCurrentY(null)
    setTouchDraggedItem(null)
    setTouchDraggedIndex(null)
  }

  const handleValidate = () => {
    // Compter combien d'items sont bien placés
    let correctCount = 0
    userOrder.forEach((item, index) => {
      if (item.correctPosition === index + 1) {
        correctCount++
      }
    })

    const newScore = score + correctCount

    // Si c'est la dernière question
    if (currentQuestionIndex === quiz.quiz_data.questions.length - 1) {
      setScore(newScore)
      setIsComplete(true)

      // Calculer le total possible (somme de tous les items de toutes les questions)
      const totalItems = quiz.quiz_data.questions.reduce((sum, q) => sum + (q.items?.length || 0), 0)

      if (onComplete) {
        onComplete({
          score: newScore,
          totalQuestions: totalItems,
          percentage: Math.round((newScore / totalItems) * 100)
        })
      }
    } else {
      // Passer à la question suivante
      setScore(newScore)
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const getCorrectOrder = () => {
    return [...currentQuestion.items].sort((a, b) => a.correctPosition - b.correctPosition)
  }

  if (!currentQuestion) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Erreur: Question non trouvée</p>
      </div>
    )
  }

  // Écran de résultats final
  if (isComplete) {
    const totalItems = quiz.quiz_data.questions.reduce((sum, q) => sum + (q.items?.length || 0), 0)
    const percentage = Math.round((score / totalItems) * 100)
    const passed = percentage >= 50

    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        padding: isMobile ? '15px' : '20px'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* Header résultats */}
          <div style={{
            background: passed ? '#d1fae5' : '#fee2e2',
            padding: isMobile ? '30px 20px' : '40px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '10px' }}>
              {passed ? '🎉' : '💪'}
            </div>
            <h1 style={{
              fontSize: isMobile ? '28px' : '36px',
              color: passed ? '#065f46' : '#991b1b',
              marginBottom: '15px'
            }}>
              {passed ? 'Bravo !' : 'Continue comme ça !'}
            </h1>
            <div style={{
              fontSize: isMobile ? '32px' : '40px',
              fontWeight: 'bold',
              color: passed ? '#059669' : '#dc2626',
              marginBottom: '10px'
            }}>
              {percentage}%
            </div>
            <p style={{
              fontSize: isMobile ? '16px' : '18px',
              color: passed ? '#065f46' : '#991b1b'
            }}>
              {score} / {totalItems} élément{totalItems > 1 ? 's' : ''} bien placé{score > 1 ? 's' : ''}
            </p>
          </div>

          {/* Bouton retour */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => router.push('/quizz')}
              style={{
                padding: isMobile ? '12px 24px' : '15px 40px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ← Retour aux quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Interface de jeu
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      padding: isMobile ? '10px' : '15px',
      overflow: 'hidden'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* En-tête minimaliste */}
        <div style={{
          background: '#8b5cf6',
          padding: isMobile ? '2px 8px' : 'clamp(2px, 0.6vh, 4px) clamp(8px, 1.2vh, 12px)',
          borderRadius: '6px',
          marginBottom: isMobile ? '4px' : 'clamp(4px, 0.6vh, 6px)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: isMobile ? '32px' : 'clamp(36px, 5vh, 44px)'
        }}>
          <span style={{
            fontSize: isMobile ? '18px' : 'clamp(22px, 2.6vh, 28px)',
            fontWeight: '600',
            color: 'white',
            lineHeight: '1.2',
            textAlign: 'center'
          }}>
            {currentQuestion.text}
          </span>
        </div>

        {/* Liste des éléments à ordonner - AUCUN SCROLL */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginBottom: isMobile ? '10px' : 'clamp(10px, 1.5vh, 15px)',
          overflow: 'hidden'
        }}>

          {userOrder.map((item, index) => {
            const isDragging = isMobile && touchDraggedItem?.id === item.id
            return (
            <div
              key={item.id}
              data-item-index={index}
              draggable={!isMobile}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item)}
              onTouchStart={(e) => isMobile && handleTouchStart(e, item, index)}
              onTouchMove={(e) => isMobile && handleTouchMove(e)}
              onTouchEnd={(e) => isMobile && handleTouchEnd(e)}
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: getPadding(),
                marginBottom: index === userOrder.length - 1 ? '0' : getMarginBottom(),
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : 'clamp(8px, 1vh, 12px)',
                cursor: isMobile ? (isDragging ? 'grabbing' : 'grab') : 'move',
                transition: isDragging ? 'none' : 'all 0.15s ease',
                minHeight: getItemHeight(),
                maxHeight: getItemHeight(),
                opacity: isDragging ? 0.7 : 1,
                transform: isDragging ? 'scale(1.03) rotate(2deg)' : 'scale(1)',
                boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.2)' : 'none'
              }}
              onMouseOver={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.borderColor = '#8b5cf6'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.1)'
                }
              }}
              onMouseOut={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {/* Numéro de position */}
              <div style={{
                width: getBadgeSize(),
                height: getBadgeSize(),
                background: '#8b5cf6',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: getBadgeFontSize(),
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {index + 1}
              </div>

              {/* Texte de l'élément */}
              <div style={{
                flex: 1,
                fontSize: getFontSize(),
                color: '#1f2937',
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {item.text}
              </div>

              {/* Audio */}
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'center' }}>
                <AudioButton text={item.text} />
              </div>

              {/* Icône drag (mobile) */}
              {isMobile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  color: '#8b5cf6',
                  fontSize: '20px',
                  cursor: 'grab',
                  userSelect: 'none',
                  touchAction: 'none'
                }}>
                  ⋮⋮
                </div>
              )}
            </div>
          )
        })}
        </div>

        {/* Bouton valider */}
        <div style={{ textAlign: 'center', flexShrink: 0, marginTop: isMobile ? '8px' : 'clamp(6px, 0.8vh, 10px)' }}>
          <button
            onClick={handleValidate}
            style={{
              padding: isMobile ? '10px 25px' : 'clamp(8px, 1vh, 10px) clamp(25px, 3vw, 35px)',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: isMobile ? '14px' : 'clamp(16px, 1.8vh, 20px)',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✅ Valider
          </button>
        </div>
      </div>
    </div>
  )
}
