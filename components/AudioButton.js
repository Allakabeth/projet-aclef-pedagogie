import { useState, useRef, useEffect } from 'react';
import styles from '../styles/learner.module.css';

const AudioButton = ({ text, audioUrl, autoPlay = false, size = 'normal', disabled = false, onRightClick, isMuted = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = async () => {
    if (isPlaying) return;

    setIsPlaying(true);

    try {
      // Priorité à l'audio URL si fourni
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          // Fallback vers synthèse vocale
          speakText(text);
        };
        await audio.play();
      } else if (text) {
        // Utilisation de la synthèse vocale du navigateur
        speakText(text);
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      setIsPlaying(false);
      // Fallback vers synthèse vocale
      if (text) speakText(text);
    }
  };

  // Auto-play au montage du composant si demande (et pas muté)
  useEffect(() => {
    if (autoPlay && text && !isMuted) {
      handlePlay();
    }
  }, [autoPlay, text, isMuted]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Arrêter toute synthèse en cours
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configuration pour francais
      utterance.lang = 'fr-FR';
      utterance.rate = 0.8; // Vitesse plus lente pour apprenants
      utterance.pitch = 1;
      utterance.volume = 1;

      // Essayer de trouver une voix masculine française
      const voices = window.speechSynthesis.getVoices();

      // Debug : afficher toutes les voix françaises disponibles
      console.log('Voix françaises disponibles:', voices.filter(v => v.lang.includes('fr')).map(v => v.name));

      // Priorité : voix masculines (Henri, Paul, Thomas)
      const maleVoice = voices.find(voice =>
        (voice.name.includes('Henri') || voice.name.includes('Paul') || voice.name.includes('Thomas')) &&
        voice.lang.includes('fr')
      );

      // Sinon, chercher une autre voix française (mais pas Hortense)
      const otherFrenchVoice = voices.find(voice =>
        (voice.lang.includes('fr') || voice.name.includes('French')) &&
        !voice.name.includes('Hortense')
      );

      // Fallback sur n'importe quelle voix française
      const anyFrenchVoice = voices.find(voice =>
        voice.lang.includes('fr') || voice.name.includes('French')
      );

      if (maleVoice) {
        utterance.voice = maleVoice;
        console.log('Voix utilisée:', maleVoice.name);
      } else if (otherFrenchVoice) {
        utterance.voice = otherFrenchVoice;
        console.log('Voix utilisée:', otherFrenchVoice.name);
      } else if (anyFrenchVoice) {
        utterance.voice = anyFrenchVoice;
        console.log('Voix utilisée (fallback):', anyFrenchVoice.name);
      }

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      alert('Desole, l\'audio n\'est pas disponible sur votre appareil');
    }
  };

  const buttonClass = size === 'large' 
    ? `${styles.audioButton} ${styles.audioButtonLarge}` 
    : size === 'small'
    ? `${styles.audioButton} ${styles.audioButtonSmall}`
    : styles.audioButton;

  const handleRightClick = (e) => {
    e.preventDefault(); // Empêcher le menu contextuel
    if (onRightClick) {
      onRightClick();
    }
  };

  const handleMouseDown = (e) => {
    setIsLongPress(false);
    const timer = setTimeout(() => {
      setIsLongPress(true);
      if (onRightClick) {
        onRightClick(); // Déclencher l'action mute sur appui long
      }
    }, 500); // 500ms pour déclencher l'appui long
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleClick = (e) => {
    // Si c'était un appui long, ne pas déclencher le clic normal
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }
    handlePlay();
  };

  // Nettoyer les timers au démontage du composant
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const getButtonIcon = () => {
    if (isMuted) return '🔇';
    if (disabled) return '🔇';
    if (isPlaying) return '🔊';
    return '🔈';
  };

  const getButtonTitle = () => {
    if (isMuted) return 'Clic: Jouer | Clic droit/Appui long: Reactiver le son';
    if (disabled) return 'Audio desactive';
    return 'Clic: Jouer | Clic droit/Appui long: Couper le son';
  };

  return (
    <button
      className={buttonClass}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      disabled={isPlaying}
      aria-label={`Ecouter : ${text || 'contenu audio'}`}
      title={getButtonTitle()}
      style={{ 
        opacity: (disabled && !isMuted) ? 0.5 : 1,
        cursor: 'pointer',
        background: isMuted ? '#e74c3c' : undefined,
        userSelect: 'none', // Empêcher la sélection de texte sur appui long
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <span role="img" aria-label={isMuted ? 'Audio mute' : isPlaying ? 'En cours de lecture' : 'Lire l\'audio'}>
        {getButtonIcon()}
      </span>
      <span className={styles.srOnly}>
        {isMuted ? 'Audio mute - appui long pour reactiver' : isPlaying ? 'Lecture en cours...' : 'Cliquer pour ecouter'}
      </span>
    </button>
  );
};

export default AudioButton;