# Super Mario English Challenge

An interactive web application designed to help users learn English color names using speech recognition and gamification inspired by Super Mario. Developed as part of the Digital Innovation One (DIO) educational curriculum.

---

## Project Overview & Architecture

### Overview
Super Mario English Challenge presents the player with a visual block/box displaying a target English color name and background color. The user speaks the color name into their microphone using Web Speech API (`SpeechRecognition`). Correct pronunciations reward the player with Mario coins (+1 score) and play sound effects, while incorrect answers deduct coins (-1 score).

### Architecture
- **Frontend Presentation (`index.html` & `css/style.css`):** Semantic HTML5 structure with strict Content Security Policy (CSP), responsive CSS layout, and ARIA accessibility labels (`aria-live`, `role="img"`).
- **Game Engine & Speech Core (`js/functions.js`):** Modular, object-oriented JavaScript (`ColorGame` class) wrapped in an IIFE. Manages game state, speech recognition lifecycle, transcript sanitization, score tracking, and audio feedback.
- **Test Suite (`tests/functions.test.js`):** Jest and JSDOM testing environment for unit and integration testing.

---

## Setup & Installation Instructions

### Prerequisites
- **Node.js**: v18.x or higher
- **Browser**: Modern web browser with Web Speech API support (e.g. Google Chrome, Microsoft Edge, Safari)

### Installation
1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/speech-recognizer-mario.git
   cd speech-recognizer-mario
   ```

2. Install development dependencies:
   ```bash
   npm install
   ```

3. Open `index.html` in your browser, or serve it using a local static web server (e.g., Live Server or `npx serve .`).

---

## Environment Variables Required

No external API keys or server-side environment variables are required. The application runs entirely client-side using native browser Web Speech API (`window.SpeechRecognition` / `window.webkitSpeechRecognition`).

---

## How to Run the Test Suite

The project includes a comprehensive Jest test suite covering core game logic, DOM rendering, audio promise rejections, transcript sanitization, and Speech Recognition event handlers.

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage Report
```bash
npx jest --coverage
```

---

## Security Considerations & Vulnerabilities Resolved

During the code audit and refactoring phase, several critical vulnerabilities and bugs were identified and resolved:

| ID | Issue Description | Severity | Remediation Applied |
|---|---|---|---|
| **SEC-01** | Global Namespace Pollution (`OWASP A04:2021`) | Medium | Encapsulated all game variables and classes inside an IIFE and module scope to prevent global state tampering. |
| **SEC-02** | Missing Content Security Policy | Medium | Added CSP header meta tag in `index.html` restricting script, media, and style sources. |
| **BUG-01** | `gravador.continuos` Property Typo | High | Corrected property to `recognition.continuous = false;`. |
| **BUG-02** | Uncaught `ReferenceError` on Unsupported Browsers | Critical | Added feature detection and graceful UI degradation when Speech API is missing in the browser. |
| **BUG-03** | Unhandled Audio Play Promises | Medium | Implemented `safePlayAudio()` catching and handling `HTMLAudioElement.play()` promise rejections caused by autoplay policies. |
| **BUG-04** | Absolute Asset Image Paths | Low | Converted `/img/caixa-fechada.png` absolute path to relative `img/caixa-fechada.png` path for reliable hosting in subdirectories (e.g. GitHub Pages). |
| **BUG-05** | Transcript Match Failures | Low | Added `sanitizeTranscript()` to strip trailing punctuation and whitespace returned by speech engines. |
