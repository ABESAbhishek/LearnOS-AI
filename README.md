# LearnOS AI 🧠

### Adaptive AI-Powered Learning Platform

LearnOS AI is an adaptive learning platform designed to understand **what a student needs to learn, where they are struggling, and what they should study next**.

Instead of providing the same learning path to every student, LearnOS builds a continuous learning loop:

**Syllabus → Assessment → Knowledge Map → AI Tutor → Practice → Adaptive Study Plan**

---

## 🚀 What is LearnOS?

LearnOS combines AI-powered analysis with a student's learning performance to create a personalized learning experience.

The platform can:

* Analyze a student's syllabus and learning material
* Identify important topics and learning priorities
* Diagnose knowledge gaps through assessments
* Visualize topic mastery through an interactive Knowledge Map
* Provide personalized AI tutoring
* Track improvement through practice
* Automatically adapt the student's study plan

The goal is simple:

> **Don't just tell students what to study. Understand what they need to learn next.**

---

## ✨ Core Features

### 🔐 Student Login

A dedicated student entry point allows learners to access the platform through a simple login experience.

The application separates authentication state from learning state, allowing the learning engine to operate independently from the login system.

---

### 📚 AI Syllabus Analysis

Students can upload their syllabus or learning material.

LearnOS analyzes the material and extracts:

* Topics
* Difficulty
* Priority
* Frequency
* Important concepts
* Learning areas

The system can use AI-powered analysis while maintaining a deterministic fallback for reliability.

---

### 📝 Diagnostic Assessment

LearnOS generates or uses diagnostic questions to determine the student's current understanding.

The assessment evaluates topic-level performance and identifies areas that require additional attention.

---

### 🗺️ Interactive Knowledge Map

The Knowledge Map provides a visual representation of the student's learning profile.

Example DSA knowledge profile:

| Topic        | Mastery |
| ------------ | ------: |
| Arrays       |     91% |
| Linked Lists |     83% |
| Stacks       |     76% |
| Trees        |     58% |
| Hashing      |     47% |
| Graphs       |     31% |

The system can identify a topic such as **Graph Traversal** as a priority gap and guide the student toward targeted learning.

---

### 🤖 AI Tutor

The AI Tutor provides a staged learning experience:

**01 — Intuition**

Build an intuitive understanding of the concept.

**02 — Visual**

Interact with a visual example and step through the concept.

**03 — Practice**

Apply the concept through an interactive question.

For example, the current demonstration teaches **Breadth-First Search (BFS)** using graph traversal and queue states.

---

### 🔄 Adaptive Study Plan

The study plan changes according to the student's performance.

Instead of providing a fixed curriculum, LearnOS can move from foundational topics toward more advanced applications when mastery improves.

Example progression:

```text
Weak Graph Traversal
        ↓
BFS Fundamentals
        ↓
Guided Traversal
        ↓
Practice
        ↓
Improved Mastery
        ↓
Advanced Graph Applications
```

---

### 📊 Live Learning Dashboard

The dashboard provides a centralized view of:

* Overall mastery
* Current learning focus
* Knowledge profile
* Learning progress
* Adaptive plan status

The dashboard updates as the learner progresses through the system.

---

## 🧠 AI Architecture

LearnOS uses a layered AI architecture designed for reliability.

```text
                    LearnOS AI
                        │
                ┌───────┴───────┐
                │   AI Router   │
                └───────┬───────┘
                        │
             ┌──────────┼──────────┐
             ↓          ↓          ↓
          Gemini      Groq      Other Free
          Provider   Provider    Provider
             │          │          │
             └──────────┼──────────┘
                        ↓
              Deterministic Fallback
```

AI-powered functionality is isolated behind server-side API routes.

Current AI-powered areas include:

* Syllabus analysis
* Diagnostic assessment generation
* AI Tutor explanations
* Adaptive study-plan generation

If an AI provider becomes unavailable, the application can fall back to deterministic data so that the learning experience remains functional.

---

## 🛡️ Reliability First

AI should improve the experience, not break it.

LearnOS is designed so that temporary AI failures such as:

* Rate limits
* Service overload
* Network errors
* Timeouts
* Invalid AI responses

do not result in a broken application.

The system validates AI-generated structured responses before allowing them into the application.

---

## 🏗️ Architecture

```text
Next.js Application
        │
        ├── Student Authentication
        │
        ├── LearningContext
        │       │
        │       ├── Syllabus
        │       ├── Assessment
        │       ├── Knowledge
        │       ├── Tutor
        │       └── Study Plan
        │
        ├── AI API Routes
        │       │
        │       ├── Analyze Syllabus
        │       ├── Generate Assessment
        │       ├── Tutor Explanation
        │       └── Adapt Plan
        │
        └── AI Provider Router
                │
                ├── Gemini
                ├── Free AI Providers
                └── Deterministic Fallback
```

---

## 🛠️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### AI

* Google Gemini
* Free-tier AI providers through the AI router
* Deterministic fallback system

### Architecture

* Next.js Route Handlers
* React Context
* Structured AI responses
* Client-side learning state

### Development

* Git
* GitHub
* ESLint
* TypeScript
* Turbopack

---

## 📁 Project Structure

```text
learnos-ai/
│
├── src/
│   ├── app/
│   │   ├── about/
│   │   ├── api/
│   │   │   ├── adapt-plan/
│   │   │   ├── analyze-syllabus/
│   │   │   ├── generate-assessment/
│   │   │   └── tutor-explain/
│   │   ├── assessment/
│   │   ├── dashboard/
│   │   ├── knowledge-map/
│   │   ├── login/
│   │   ├── plan/
│   │   ├── tutor/
│   │   └── upload/
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   ├── features/
│   │   └── motion/
│   │
│   ├── context/
│   │   └── learning-context.tsx
│   │
│   ├── lib/
│   │   ├── gemini.ts
│   │   └── ai-router.ts
│   │
│   └── types/
│
├── public/
│
├── package.json
├── next.config.ts
└── README.md
```

---

## 🔄 LearnOS Learning Loop

The complete student journey is:

```text
Student Login
      ↓
Dashboard
      ↓
Upload Syllabus
      ↓
AI Syllabus Analysis
      ↓
Diagnostic Assessment
      ↓
Knowledge Map
      ↓
Identify Knowledge Gap
      ↓
AI Tutor
      ↓
Interactive Practice
      ↓
Mastery Update
      ↓
Adaptive Study Plan
      ↓
Dashboard
```

This creates a continuous feedback loop where the learner's performance influences what they learn next.

---

## 🎯 Example: DSA Learning Journey

A demonstration learner starts with:

```text
Graphs: 31
```
