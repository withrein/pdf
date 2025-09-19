// Firebase configuration example
// Copy this file to firebase-config.js and fill in your actual Firebase credentials

export const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id-here"
};

// To get your Firebase config:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project (or create a new one)
// 3. Go to Project Settings (gear icon)
// 4. Scroll down to "Your apps" section
// 5. Click "Web app" icon to create/view web app
// 6. Copy the configuration object

// Example project structure in Firestore:
/*
exams/
  ├── ЭШ-2025-Математик-A-хувилбар/
  │   ├── name: "ЭШ-2025-Математик-A-хувилбар"
  │   ├── subject: "Математик"
  │   ├── year: 2025
  │   ├── variant: "A"
  │   ├── totalQuestions: 39
  │   ├── multipleChoiceCount: 36
  │   ├── fillInCount: 3
  │   ├── createdAt: "2024-01-15T10:30:00.000Z"
  │   └── questions/
  │       ├── mc_1/
  │       │   ├── id: "mc_1"
  │       │   ├── type: "multiple_choice"
  │       │   ├── questionNumber: 1
  │       │   ├── questionText: "√√25⁵ илэрхийллийн утгыг олоорой"
  │       │   ├── options: [
  │       │   │   { letter: "A", text: "√5" },
  │       │   │   { letter: "B", text: "5" },
  │       │   │   { letter: "C", text: "25" },
  │       │   │   { letter: "D", text: "⁵√5" },
  │       │   │   { letter: "E", text: "1/5" }
  │       │   ├── points: 1
  │       │   ├── section: 1
  │       │   └── extracted: "2024-01-15T10:30:00.000Z"
  │       ├── fill_2_1/
  │       │   ├── id: "fill_2_1"
  │       │   ├── type: "fill_in"
  │       │   ├── questionNumber: "2.1"
  │       │   ├── questionText: "Нөхөх асуултын текст"
  │       │   ├── parts: [
  │       │   │   { partNumber: 1, text: "Эхний хэсэг", points: 3 },
  │       │   │   { partNumber: 2, text: "Хоёрдугаар хэсэг", points: 2 },
  │       │   │   { partNumber: 3, text: "Гуравдугаар хэсэг", points: 2 }
  │       │   ├── points: 7
  │       │   ├── section: 2
  │       │   └── extracted: "2024-01-15T10:30:00.000Z"
  │       └── ...
*/