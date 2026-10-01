/**
 * @jest-environment jsdom
 */

const { ColorGame, GAME_CONFIG } = require('../js/functions.js');

describe('Super Mario English Challenge - Game Tests', () => {
  let gameInstance;

  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = `
      <div id="container">
        <header id="cabecalho-principal">
          <div id="pontuacao-game">
            <span id="pontuacao-atual">0</span>
          </div>
          <h1 id="nome-jogo">Super Mario English Challenge</h1>
        </header>
        <main id="corpo">
          <section id="esquerda">
            <span id="cor-na-caixa"></span>
            <div id="cor-atual"></div>
            <button id="btn-responder" type="button">RESPONDER</button>
            <div id="status-mensagem" class="status-msg"></div>
          </section>
        </main>
      </div>
    `;

    // Mock HTMLAudioElement.prototype.play
    window.HTMLAudioElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());

    // Reset SpeechRecognition on window
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GAME_CONFIG', () => {
    test('contains expected colors and hex mappings', () => {
      expect(GAME_CONFIG.colors).toContain('green');
      expect(GAME_CONFIG.colors).toContain('red');
      expect(GAME_CONFIG.hexMap.green).toBe('#02EF00');
      expect(GAME_CONFIG.backgroundImage).toBe('img/caixa-fechada.png');
    });
  });

  describe('ColorGame Initialization without Speech Recognition', () => {
    test('initializes game state and shows fallback message when Speech API is missing', () => {
      gameInstance = new ColorGame();

      expect(gameInstance.score).toBe(0);
      expect(GAME_CONFIG.colors).toContain(gameInstance.currentColor);

      const statusElement = document.getElementById('status-mensagem');
      expect(statusElement.textContent).toContain('Navegador não possui suporte');

      const btn = document.getElementById('btn-responder');
      expect(btn.disabled).toBe(true);
    });
  });

  describe('Score Management and Audio', () => {
    beforeEach(() => {
      gameInstance = new ColorGame();
    });

    test('updates score correctly for positive and negative values', () => {
      const scoreElement = document.getElementById('pontuacao-atual');

      gameInstance.updateScore(1);
      expect(gameInstance.score).toBe(1);
      expect(scoreElement.textContent).toBe('1');
      expect(window.HTMLAudioElement.prototype.play).toHaveBeenCalled();

      gameInstance.updateScore(-1);
      expect(gameInstance.score).toBe(0);
      expect(scoreElement.textContent).toBe('0');
    });

    test('handles audio play rejection gracefully without throwing exception', async () => {
      window.HTMLAudioElement.prototype.play = jest.fn().mockImplementation(() => Promise.reject(new Error('Autoplay blocked')));
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      gameInstance.safePlayAudio(gameInstance.audioSuccess);

      // Allow promise rejection microtask to flush
      await Promise.resolve();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Audio playback was prevented or interrupted:',
        expect.any(Error)
      );
    });
  });

  describe('Sanitize Transcript', () => {
    beforeEach(() => {
      gameInstance = new ColorGame();
    });

    test('trims whitespace, removes punctuation, and converts to uppercase', () => {
      expect(gameInstance.sanitizeTranscript(' green. ')).toBe('GREEN');
      expect(gameInstance.sanitizeTranscript('PURPLE!!!')).toBe('PURPLE');
      expect(gameInstance.sanitizeTranscript('  yellow 123  ')).toBe('YELLOW');
      expect(gameInstance.sanitizeTranscript(null)).toBe('');
      expect(gameInstance.sanitizeTranscript('')).toBe('');
    });
  });

  describe('Answer Evaluation', () => {
    beforeEach(() => {
      gameInstance = new ColorGame();
    });

    test('increases score when transcript matches target color', () => {
      gameInstance.currentColor = 'green';
      gameInstance.evaluateAnswer('GREEN');

      expect(gameInstance.score).toBe(1);
      const statusElement = document.getElementById('status-mensagem');
      expect(statusElement.textContent).toContain('Correto!');
    });

    test('decreases score when transcript does not match target color', () => {
      gameInstance.currentColor = 'green';
      gameInstance.evaluateAnswer('RED');

      expect(gameInstance.score).toBe(-1);
      const statusElement = document.getElementById('status-mensagem');
      expect(statusElement.textContent).toContain('Incorreto!');
    });
  });

  describe('Speech Recognition Setup & Event Handling', () => {
    let mockSpeechRecognition;

    beforeEach(() => {
      mockSpeechRecognition = jest.fn().mockImplementation(() => ({
        continuous: false,
        lang: '',
        interimResults: false,
        start: jest.fn(),
        onstart: null,
        onend: null,
        onresult: null,
        onerror: null
      }));

      window.SpeechRecognition = mockSpeechRecognition;
      gameInstance = new ColorGame();
    });

    test('configures speech recognition instance correctly', () => {
      expect(mockSpeechRecognition).toHaveBeenCalled();
      expect(gameInstance.recognition.continuous).toBe(false);
      expect(gameInstance.recognition.lang).toBe('en-US');
    });

    test('handles recognition onstart event', () => {
      gameInstance.recognition.onstart();

      expect(gameInstance.isListening).toBe(true);
      const btn = document.getElementById('btn-responder');
      expect(btn.textContent).toBe('Estou Ouvindo :D');
    });

    test('handles recognition onend event', () => {
      gameInstance.recognition.onend();

      expect(gameInstance.isListening).toBe(false);
      const btn = document.getElementById('btn-responder');
      expect(btn.textContent).toBe('RESPONDER');
    });

    test('handles recognition onresult event and evaluates transcript', () => {
      gameInstance.currentColor = 'purple';
      const mockEvent = {
        results: [
          [
            { transcript: 'purple' }
          ]
        ]
      };

      gameInstance.recognition.onresult(mockEvent);
      expect(gameInstance.score).toBe(1);
    });

    test('handles recognition errors (no-speech, not-allowed, general)', () => {
      const statusElement = document.getElementById('status-mensagem');

      gameInstance.recognition.onerror({ error: 'no-speech' });
      expect(statusElement.textContent).toContain('Nenhum som foi detectado');

      gameInstance.recognition.onerror({ error: 'not-allowed' });
      expect(statusElement.textContent).toContain('Permissão para uso do microfone foi negada');

      gameInstance.recognition.onerror({ error: 'network' });
      expect(statusElement.textContent).toContain('Erro no reconhecimento: network');
    });

    test('prevents starting recognition multiple times if already listening', () => {
      gameInstance.isListening = true;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      gameInstance.startListening();

      expect(gameInstance.recognition.start).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Recognition is already running.');
    });

    test('triggers recognition.start() when not listening and responder button is clicked', () => {
      gameInstance.isListening = false;
      const btn = document.getElementById('btn-responder');

      btn.click();

      expect(gameInstance.recognition.start).toHaveBeenCalled();
    });
  });
});
