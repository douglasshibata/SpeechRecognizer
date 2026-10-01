/**
 * Super Mario English Challenge - Game Engine & Speech Recognition
 * Encapsulated implementation with robust error handling, security hygiene, and clean state management.
 */

(function () {
  'use strict';

  // Game configuration & color dictionary
  const GAME_CONFIG = Object.freeze({
    colors: ['green', 'purple', 'pink', 'red', 'yellow', 'orange', 'grey', 'black'],
    hexMap: Object.freeze({
      green: '#02EF00',
      purple: '#790093',
      pink: '#F02A7E',
      red: '#E90808',
      yellow: '#E7D703',
      orange: '#F16529',
      grey: '#EBEBEB',
      black: '#141414'
    }),
    audioPaths: Object.freeze({
      success: 'audio/moeda.mp3',
      error: 'audio/errou.mp3'
    }),
    backgroundImage: 'img/caixa-fechada.png' // Fixed relative path
  });

  // Game state encapsulation
  class ColorGame {
    constructor() {
      this.score = 0;
      this.currentColor = '';
      this.isListening = false;

      // Audio elements with promise error handling
      this.audioSuccess = new Audio(GAME_CONFIG.audioPaths.success);
      this.audioError = new Audio(GAME_CONFIG.audioPaths.error);

      // DOM Elements
      this.scoreElement = document.getElementById('pontuacao-atual');
      this.colorLabelElement = document.getElementById('cor-na-caixa');
      this.colorBoxElement = document.getElementById('cor-atual');
      this.responderBtn = document.getElementById('btn-responder');
      this.statusMsgElement = document.getElementById('status-mensagem');

      this.recognition = null;
      this.init();
    }

    /**
     * Initializes the game state, speech recognition API, and event listeners.
     */
    init() {
      this.drawNewColor();
      this.setupSpeechRecognition();
      this.bindEvents();
    }

    /**
     * Safely plays audio clips catching autoplay or browser audio restrictions.
     * @param {HTMLAudioElement} audioElement
     */
    safePlayAudio(audioElement) {
      if (!audioElement) return;
      audioElement.currentTime = 0;
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Audio playback was prevented or interrupted:', error);
        });
      }
    }

    /**
     * Selects a random color and updates the UI box.
     */
    drawNewColor() {
      const randomIndex = Math.floor(Math.random() * GAME_CONFIG.colors.length);
      const selectedColor = GAME_CONFIG.colors[randomIndex];
      this.currentColor = selectedColor;

      if (this.colorLabelElement) {
        this.colorLabelElement.textContent = selectedColor.toUpperCase();
      }

      if (this.colorBoxElement) {
        const hex = GAME_CONFIG.hexMap[selectedColor];
        this.colorBoxElement.style.backgroundColor = hex;
        // Correct relative path for background image
        this.colorBoxElement.style.backgroundImage = `url("${GAME_CONFIG.backgroundImage}")`;
        this.colorBoxElement.style.backgroundSize = '100%';
      }
    }

    /**
     * Updates player score and plays corresponding audio feedback.
     * @param {number} delta
     */
    updateScore(delta) {
      this.score += delta;
      if (this.scoreElement) {
        this.scoreElement.textContent = String(this.score);
      }

      if (delta < 0) {
        this.safePlayAudio(this.audioError);
      } else {
        this.safePlayAudio(this.audioSuccess);
      }
    }

    /**
     * Sanitizes raw speech transcript text into clean uppercase color string.
     * @param {string} rawTranscript
     * @returns {string}
     */
    sanitizeTranscript(rawTranscript) {
      if (!rawTranscript) return '';
      // Remove trailing punctuation, whitespace, and non-alpha characters
      return rawTranscript.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
    }

    /**
     * Evaluates transcript input against expected target color.
     * @param {string} rawTranscript
     */
    evaluateAnswer(rawTranscript) {
      const sanitizedAnswer = this.sanitizeTranscript(rawTranscript);
      const expectedAnswer = this.currentColor.toUpperCase();

      if (sanitizedAnswer === expectedAnswer) {
        this.updateScore(1);
        this.showStatus('Correto! +1 Moeda', '#02EF00');
      } else {
        this.updateScore(-1);
        this.showStatus(`Incorreto! Você disse "${sanitizedAnswer || '...'}"`, '#E90808');
      }

      this.drawNewColor();
    }

    /**
     * Displays temporal feedback status messages in UI.
     * @param {string} message
     * @param {string} color
     */
    showStatus(message, color = '#FFFFFF') {
      if (this.statusMsgElement) {
        this.statusMsgElement.textContent = message;
        this.statusMsgElement.style.color = color;
      }
    }

    /**
     * Configures SpeechRecognition web API safely.
     */
    setupSpeechRecognition() {
      const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechAPI) {
        this.showStatus('Navegador não possui suporte para Reconhecimento de Voz.', '#E90808');
        if (this.responderBtn) {
          this.responderBtn.disabled = true;
          this.responderBtn.style.opacity = '0.5';
          this.responderBtn.style.cursor = 'not-allowed';
        }
        return;
      }

      this.recognition = new SpeechAPI();
      // Fixed typo: 'continuous' instead of 'continuos'
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.responderBtn) {
          this.responderBtn.textContent = 'Estou Ouvindo :D';
          this.responderBtn.style.backgroundColor = 'white';
          this.responderBtn.style.color = 'black';
        }
        this.showStatus('Fale agora...', '#FFFFFF');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.responderBtn) {
          this.responderBtn.textContent = 'RESPONDER';
          this.responderBtn.style.backgroundColor = 'transparent';
          this.responderBtn.style.color = 'white';
        }
      };

      this.recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          this.evaluateAnswer(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          this.showStatus('Nenhum som foi detectado. Tente novamente!', '#E7D703');
        } else if (event.error === 'not-allowed') {
          this.showStatus('Permissão para uso do microfone foi negada.', '#E90808');
        } else {
          this.showStatus(`Erro no reconhecimento: ${event.error}`, '#E90808');
        }
      };
    }

    /**
     * Binds button click and key listeners.
     */
    bindEvents() {
      if (this.responderBtn) {
        this.responderBtn.addEventListener('click', () => {
          this.startListening();
        });
      }
    }

    /**
     * Triggers speech recognition safely preventing InvalidStateError.
     */
    startListening() {
      if (!this.recognition) {
        this.showStatus('Reconhecimento de voz não suportado neste navegador.', '#E90808');
        return;
      }

      if (this.isListening) {
        console.warn('Recognition is already running.');
        return;
      }

      try {
        this.recognition.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  }

  // Export or instantiate when DOM is ready
  if (typeof window !== 'undefined') {
    window.ColorGame = ColorGame;
    document.addEventListener('DOMContentLoaded', () => {
      window.gameInstance = new ColorGame();
    });
  }

  // Export for testing in Node / CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ColorGame, GAME_CONFIG };
  }
})();
