# 🇬🇧 FluentAI — Your Real-Time Voice English Tutor

[![Powered by Gemini Live](https://img.shields.io/badge/Powered%20by-Gemini%20Live%20API-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> An intelligent, real-time voice English tutor built with **Gemini Live API**, featuring low-latency speech conversations, instant articulatory phonetics diagrams, structured CEFR difficulty progression, web search grounding, and active document learning.

---

## 🌟 Key Features

### 🎙️ 1. Real-Time Spoken Conversation (Gemini Live Audio)
- Ultra-low latency voice exchange streaming 16kHz PCM audio to Gemini Live and receiving 24kHz native audio responses.
- Interactive wave visualizer synchronized with user speech and tutor speaking state.
- Gentle background study ambiences (Gentle Rain, London Café, Silence).

### 🎯 2. Direct CEFR Level Selection (A1 to C2)
Choose your difficulty level with one click directly from the header:
- **A1 (Beginner)**: Slower pace, fundamental vocabulary, simple syntax.
- **A2 (Elementary)**: Daily routine expressions and simple direct exchanges.
- **B1 (Intermediate)**: Conversational fluency, travel, and practical grammar.
- **B2 (Upper-Intermediate)**: Spontaneous debate and complex topics.
- **C1 (Advanced)**: Academic, professional, and nuanced English.
- **C2 (Mastery)**: Idiomatic depth and near-native flow.

### 📚 3. 7 Targeted Learning Pillars
Directly steer your learning session with one click:
1. **💬 Free Conversation**: Spontaneous debate with active, gentle corrections.
2. **📘 Grammar Drills**: Sentence structure, clauses, tricky prepositions, and explanations.
3. **🗣️ Pronunciation & Phonetics**: Accent training with synchronized **Mouth Placement Diagrams** for difficult phonemes (`TH`, `R`, `L`, `F/V`, `W`).
4. **📚 Vocabulary & False Friends**: Thematic vocabulary expansion and French-English false friend alerts.
5. **⏱️ Verb Conjugation**: Irregular verbs, *Past Simple* vs. *Present Perfect*, conditionals.
6. **🎭 Idioms & Real Slang**: Authentic British expressions, colloquialisms, and humor.
7. **📄 Document Deep-Dive**: Targeted exercises based on uploaded study materials.

### 🌐 4. Live Web Search Grounding
- Seamlessly powered by Google Search to discuss real-time news, verify contemporary cultural facts, and explain modern neologisms.

### 📄 5. Study Document Analysis (PDF & Text)
- Drag-and-drop or paste articles, course notes, CVs, or essays.
- One-click workouts: reading comprehension quizzes, vocabulary breakdowns, and mock interview debates.

### 🧠 6. Long-Term Memory & Persistent Notebook
- Automatically records recurring mistakes, grammar hurdles, and newly learned vocabulary in a local persistent notebook (`localStorage`).

### 🛡️ 7. Hardened & Secure Architecture
- Strict prompt injection boundaries isolating untrusted user documents.
- Defenses against ReDoS, buffer bloat, and prototype pollution.
- Safe client-side image resizing and media type validation.

---

## 🎭 11 Google Live Voice Personas

| Voice | Style & Tone | Recommended For |
|---|---|---|
| **Puck** | Playful & Energetic | Everyday banter & casual chat |
| **Zephyr** | Warm & Natural | Smooth, contemporary conversation |
| **Charon** | Authoritative & Rigorous | Grammar rules & sentence structure |
| **Aoede** | Polite & Professional | Business English & interview prep |
| **Kore** | Soft & Reassuring | Beginners & confidence building |
| **Fenrir** | Fast-paced & Resonant | Native listening comprehension |
| **Orus** | Methodical & Articulate | Vocabulary expansion & nuance |
| **Leda** | Dynamic & Enthusiastic | High-energy grammar drills |
| **Autonoe** | Melodic & Phonetic | Accent reduction & mouth placement |
| **Callirrhoe**| Calm & Analytical | Text analysis & essay review |
| **Enceladus** | Deep & Patient | Constructive mentoring & slow pace |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bruno-mazzetti/fluentai-english-tutor.git
   cd fluentai-english-tutor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file at the root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **AI & Audio Engine**: `@google/genai` (Gemini Live API), Web Audio API (PCM 16k/24k streaming)
- **Tooling**: Vite 6, TypeScript Compiler

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
