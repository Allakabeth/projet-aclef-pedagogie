import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AudioButton from './AudioButton'

export default function QuizPlayerMatching({ quiz, onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userMatches, setUserMatches] = useState({}) // { rightId: leftId }
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverTarget, setDragOverTarget] = useState(null)
  const [shuffledLeftColumn, setShuffledLeftColumn] = useState([])
  const [shuffledRightColumn, setShuffledRightColumn] = useState([])
  const [isMobile, setIsMobile] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const router = useRouter()

  const questions = quiz.quiz_data?.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  // Détecter si mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fonction pour mélanger un tableau (Fisher-Yates shuffle)
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    if (currentQuestion) {
      // Mélanger les colonnes séparément
      setShuffledLeftColumn(shuffleArray(currentQuestion.leftColumn || []))
      setShuffledRightColumn(shuffleArray(currentQuestion.rightColumn || []))

      // Initialiser les associations vides
      const initialMatches = {}
      currentQuestion.rightColumn?.forEach(item => {
        initialMatches[item.id] = ''
      })
      setUserMatches(initialMatches)
    }
  }, [currentQuestionIndex, currentQuestion?.id])

  // Démarrer le drag
  const handleDragStart = (e, rightItem) => {
    if (showFeedback) return
    setDraggedItem(rightItem)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Drag au-dessus d'une cible
  const handleDragOver = (e, leftItem) => {
    if (showFeedback) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(leftItem.id)
  }

  // Quitter la zone de drop
  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  // Déposer l'association
  const handleDrop = (e, leftItem) => {
    if (showFeedback) return
    e.preventDefault()

    if (draggedItem) {
      setUserMatches(prev => ({
        ...prev,
        [draggedItem.id]: leftItem.id
      }))
    }

    setDraggedItem(null)
    setDragOverTarget(null)
  }

  // Fin du drag
  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverTarget(null)
  }

  // Supprimer une association
  const handleRemoveMatch = (rightId) => {
    if (showFeedback) return
    setUserMatches(prev => ({
      ...prev,
      [rightId]: ''
    }))
  }

  const handleValidate = () => {
    if (showFeedback) return

    // Vérifier combien d'associations sont correctes
    let correctCount = 0
    currentQuestion.rightColumn?.forEach(rightItem => {
      if (userMatches[rightItem.id] === rightItem.matchWith) {
        correctCount++
      }
    })

    const totalAssociations = currentQuestion.rightColumn?.length || 0
    const isFullyCorrect = correctCount === totalAssociations

    // Stocker le nombre d'associations correctes au lieu du score de questions
    setScore(correctCount)

    setShowFeedback(true)

    // Son de feedback
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(isFullyCorrect ? 800 : 400, audioContext.currentTime)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Audio feedback non disponible')
    }

    // Si c'est la dernière question, marquer comme terminé
    if (currentQuestionIndex >= totalQuestions - 1) {
      setIsComplete(true)

      if (onComplete) {
        onComplete({
          score: correctCount,
          totalQuestions: totalAssociations,
          percentage: Math.round((correctCount / totalAssociations) * 100)
        })
      }
    }
  }

  const allMatched = currentQuestion?.rightColumn?.every(item => userMatches[item.id])

  // Trouver quelle carte de droite est associée à une carte de gauche
  const getRightItemMatchedWith = (leftId) => {
    const rightId = Object.keys(userMatches).find(key => userMatches[key] === leftId)
    return shuffledRightColumn.find(r => r.id === rightId)
  }

  if (!currentQuestion) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>❌ Erreur</div>
          <p>Quiz non trouvé ou sans questions</p>
          <button
            onClick={() => router.push('/quizz/index')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Retour aux quiz
          </button>
        </div>
      </div>
    )
  }

  if (isComplete) {
    const totalAssociations = currentQuestion.rightColumn?.length || 0
    const finalScore = score
    const percentage = Math.round((finalScore / totalAssociations) * 100)
    const passed = percentage >= 50

    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* En-tête résultats */}
          <div style={{
            textAlign: 'center',
            marginBottom: '30px',
            padding: '20px',
            background: passed ? '#d1fae5' : '#fee2e2',
            borderRadius: '12px',
            border: `3px solid ${passed ? '#10b981' : '#ef4444'}`
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>
              {passed ? '🎉' : '💪'}
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: passed ? '#065f46' : '#991b1b',
              marginBottom: '10px'
            }}>
              {passed ? 'Bravo !' : 'Continue comme ça !'}
            </h1>
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: passed ? '#10b981' : '#ef4444',
              marginBottom: '10px'
            }}>
              {percentage}%
            </div>
            <p style={{
              fontSize: '16px',
              color: passed ? '#065f46' : '#991b1b',
              fontWeight: '500'
            }}>
              {finalScore} / {totalAssociations} associations correctes
            </p>
          </div>

          {/* Détail des réponses */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#1f2937'
          }}>
            📋 Détail de tes réponses
          </h2>

          <div style={{ marginBottom: '30px' }}>
            {currentQuestion.leftColumn?.map((leftItem) => {
              const matchedRightItem = getRightItemMatchedWith(leftItem.id)
              const isCorrect = matchedRightItem && matchedRightItem.matchWith === leftItem.id
              const correctRightItem = currentQuestion.rightColumn?.find(r => r.matchWith === leftItem.id)

              return (
                <div
                  key={leftItem.id}
                  style={{
                    marginBottom: '15px',
                    padding: '20px',
                    background: isCorrect ? '#d1fae5' : '#fee2e2',
                    borderRadius: '12px',
                    border: `2px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '15px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{
                        fontSize: '24px',
                        marginRight: '10px'
                      }}>
                        {isCorrect ? '✅' : '❌'}
                      </div>
                      <div>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#1f2937',
                          marginBottom: '5px'
                        }}>
                          {leftItem.text}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: isCorrect ? '#065f46' : '#991b1b'
                        }}>
                          {matchedRightItem ? (
                            <>
                              Ta réponse : <strong>{matchedRightItem.text}</strong>
                              {!isCorrect && correctRightItem && (
                                <> • Bonne réponse : <strong>{correctRightItem.text}</strong></>
                              )}
                            </>
                          ) : (
                            <>
                              Pas de réponse • Bonne réponse : <strong>{correctRightItem?.text || '?'}</strong>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bouton retour */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => router.push('/quizz')}
              style={{
                padding: '15px 40px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}
              onMouseOver={(e) => e.target.style.background = '#7c3aed'}
              onMouseOut={(e) => e.target.style.background = '#8b5cf6'}
            >
              ← Retour aux quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: isMobile ? '5px' : '10px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Titre du quiz */}
        <h1 style={{
          fontSize: isMobile ? '14px' : 'clamp(16px, 2vw, 24px)',
          fontWeight: 'bold',
          marginBottom: isMobile ? '2px' : '4px',
          textAlign: 'center',
          color: '#1f2937'
        }}>
          {quiz.title}
        </h1>

        {/* Consigne */}
        {currentQuestion.text && (
          <p style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: isMobile ? '10px' : 'clamp(11px, 1.2vw, 16px)',
            marginBottom: isMobile ? '3px' : '6px'
          }}>
            {currentQuestion.text}
          </p>
        )}

        <p style={{
          textAlign: 'center',
          color: '#8b5cf6',
          fontSize: isMobile ? '11px' : 'clamp(12px, 1.3vw, 17px)',
          fontWeight: 'bold',
          marginBottom: isMobile ? '4px' : '8px'
        }}>
          🖐️ Glissez les cartes vertes vers les cartes bleues
        </p>

        {/* Colonnes d'association */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '12px' : 'clamp(15px, 2vw, 30px)',
          marginBottom: isMobile ? '4px' : '8px'
        }}>
          {/* Zone GAUCHE - Toutes les bleues en sous-grille */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: isMobile ? '4px' : 'clamp(5px, 0.6vw, 10px)'
          }}>
            {shuffledLeftColumn.map((leftItem) => {
              const isDragOver = dragOverTarget === leftItem.id
              const matchedRightItem = getRightItemMatchedWith(leftItem.id)
              const isCorrectMatch = showFeedback && matchedRightItem && matchedRightItem.matchWith === leftItem.id
              const isIncorrectMatch = showFeedback && matchedRightItem && matchedRightItem.matchWith !== leftItem.id

              return (
                <div
                  key={leftItem.id}
                  onDragOver={(e) => handleDragOver(e, leftItem)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, leftItem)}
                  style={{
                    padding: isMobile ? '5px' : 'clamp(6px, 0.8vw, 12px)',
                    background: isDragOver ? '#dbeafe' : isCorrectMatch ? '#d1fae5' : isIncorrectMatch ? '#fee2e2' : '#eff6ff',
                    border: `${isMobile ? '1px' : '2px'} ${isDragOver ? 'dashed' : 'solid'} ${isCorrectMatch ? '#10b981' : isIncorrectMatch ? '#ef4444' : '#3b82f6'}`,
                    borderRadius: isMobile ? '4px' : '6px',
                    minHeight: isMobile ? '40px' : 'clamp(45px, 5vw, 65px)',
                    transition: 'all 0.2s ease',
                    transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                    cursor: showFeedback ? 'default' : 'pointer'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '6px',
                    marginBottom: matchedRightItem && !showFeedback ? (isMobile ? '3px' : '6px') : '0'
                  }}>
                    <span style={{
                      fontSize: isMobile ? '11px' : 'clamp(10px, 1.2vw, 16px)',
                      color: '#1f2937',
                      fontWeight: '500',
                      lineHeight: '1.1',
                      flex: 1
                    }}>
                      {leftItem.text}
                    </span>
                    {!isMobile && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AudioButton
                          text={leftItem.text}
                          audioUrl={leftItem.audio_url}
                          size="small"
                          disabled={isMuted}
                        />
                      </div>
                    )}
                  </div>

                  {/* Carte B collée dans la carte A */}
                  {matchedRightItem && !showFeedback && (
                    <div style={{
                      marginTop: isMobile ? '2px' : '4px',
                      padding: isMobile ? '3px' : '6px',
                      background: '#10b981',
                      borderRadius: isMobile ? '3px' : '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '2px' : '4px'
                    }}>
                      <span style={{
                        fontSize: isMobile ? '8px' : 'clamp(9px, 1vw, 14px)',
                        color: 'white',
                        fontWeight: '600',
                        flex: 1,
                        lineHeight: '1.1'
                      }}>
                        {matchedRightItem.text}
                      </span>
                      <button
                        onClick={() => handleRemoveMatch(matchedRightItem.id)}
                        style={{
                          background: '#fff',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '50%',
                          width: isMobile ? '14px' : '16px',
                          height: isMobile ? '14px' : '16px',
                          cursor: 'pointer',
                          fontSize: isMobile ? '8px' : '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Feedback après validation */}
                  {showFeedback && matchedRightItem && (
                    <div style={{
                      marginTop: isMobile ? '2px' : '4px',
                      padding: isMobile ? '2px' : '4px',
                      background: isCorrectMatch ? '#d1fae5' : '#fef2f2',
                      borderRadius: isMobile ? '2px' : '3px',
                      fontSize: isMobile ? '7px' : '9px',
                      fontWeight: 'bold',
                      color: isCorrectMatch ? '#065f46' : '#991b1b',
                      lineHeight: '1.1'
                    }}>
                      {isCorrectMatch ? '✅ OK' : '❌ Non'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Zone DROITE - Toutes les vertes en sous-grille */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: isMobile ? '4px' : 'clamp(5px, 0.6vw, 10px)'
          }}>
            {shuffledRightColumn.map((rightItem) => {
              const isCorrect = showFeedback && userMatches[rightItem.id] === rightItem.matchWith
              const isIncorrect = showFeedback && userMatches[rightItem.id] && userMatches[rightItem.id] !== rightItem.matchWith
              const isDragging = draggedItem?.id === rightItem.id
              const hasMatch = userMatches[rightItem.id]

              return (
                <div
                  key={rightItem.id}
                  draggable={!showFeedback && !hasMatch}
                  onDragStart={(e) => handleDragStart(e, rightItem)}
                  onDragEnd={handleDragEnd}
                  style={{
                    padding: isMobile ? '5px' : 'clamp(6px, 0.8vw, 12px)',
                    background: isCorrect ? '#d1fae5' : isIncorrect ? '#fee2e2' : hasMatch ? '#f3f4f6' : '#f0fdf4',
                    border: `${isMobile ? '1px' : '2px'} solid ${isCorrect ? '#10b981' : isIncorrect ? '#ef4444' : hasMatch ? '#d1d5db' : '#10b981'}`,
                    borderRadius: isMobile ? '4px' : '6px',
                    cursor: showFeedback || hasMatch ? 'default' : 'grab',
                    opacity: isDragging ? 0.5 : hasMatch && !showFeedback ? 0.4 : 1,
                    transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                    minHeight: isMobile ? '40px' : 'clamp(45px, 5vw, 65px)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '6px'
                  }}>
                    <span style={{
                      fontSize: isMobile ? '11px' : 'clamp(10px, 1.2vw, 16px)',
                      color: hasMatch && !showFeedback ? '#9ca3af' : '#1f2937',
                      fontWeight: '500',
                      flex: 1,
                      lineHeight: '1.1'
                    }}>
                      {rightItem.text}
                    </span>
                    {!isMobile && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AudioButton
                          text={rightItem.text}
                          audioUrl={rightItem.audio_url}
                          size="small"
                          disabled={isMuted}
                        />
                      </div>
                    )}
                  </div>

                  {/* Message quand la carte est utilisée */}
                  {hasMatch && !showFeedback && (
                    <div style={{
                      marginTop: isMobile ? '2px' : '4px',
                      fontSize: isMobile ? '7px' : '9px',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}>
                      ✓ Associée
                    </div>
                  )}

                  {/* Feedback après validation */}
                  {showFeedback && (
                    <div style={{
                      marginTop: isMobile ? '2px' : '4px',
                      padding: isMobile ? '2px' : '4px',
                      background: isCorrect ? '#d1fae5' : '#fef2f2',
                      borderRadius: isMobile ? '2px' : '3px',
                      fontSize: isMobile ? '7px' : '9px',
                      fontWeight: 'bold',
                      color: isCorrect ? '#065f46' : '#991b1b',
                      lineHeight: '1.1'
                    }}>
                      {isCorrect ? '✅ OK' : '❌ Non'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bouton valider */}
        {!showFeedback && (
          <div style={{ textAlign: 'center', marginTop: isMobile ? '4px' : '8px' }}>
            <button
              onClick={handleValidate}
              disabled={!allMatched}
              style={{
                padding: isMobile ? '6px 16px' : 'clamp(8px, 1vw, 14px) clamp(20px, 2vw, 32px)',
                background: allMatched ? '#10b981' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: isMobile ? '4px' : '6px',
                fontSize: isMobile ? '11px' : 'clamp(12px, 1.3vw, 18px)',
                fontWeight: 'bold',
                cursor: allMatched ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease'
              }}
            >
              {allMatched ? '✅ Valider' : '⏳ Complétez'}
            </button>
          </div>
        )}

        {/* Message après validation */}
        {showFeedback && !isComplete && (
          <div style={{
            textAlign: 'center',
            marginTop: isMobile ? '8px' : '15px',
            padding: isMobile ? '8px' : '12px',
            background: '#f0fdf4',
            borderRadius: isMobile ? '6px' : '8px',
            border: `${isMobile ? '2px' : '3px'} solid #10b981`
          }}>
            <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#065f46', fontWeight: 'bold' }}>
              ✅ Vérifie tes réponses ci-dessus
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
