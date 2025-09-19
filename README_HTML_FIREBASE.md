# HTML to Firebase Question Extractor

HTML файлаас бодлого бүрийг салгаж аваад Firebase дээр хадгалах систем.

## 🎯 Зорилго

Элсэлтийн ерөнхий шалгалтын HTML файлаас математикийн бодлогуудыг автоматаар салгаж аваад Firebase Firestore дээр хадгалах.

## ✨ Боломжууд

- ✅ **HTML файлаас бодлого салгах** - pdf2htmlEX-ээр үүсгэсэн файлуудтай ажиллана
- ✅ **Сонгох асуултууд** (1-36) - A, B, C, D, E хариултуудтай
- ✅ **Нөхөх асуултууд** (2.1, 2.2, 2.3) - олон хэсэгтэй
- ✅ **Оноо тооцоолол** - асуулт бүрийн оноо
- ✅ **Firebase хадгалалт** - бүтэцтэй мэдээлэл
- ✅ **Монгол хэл дэмжлэг** - кирилл үсэг, математикийн тэмдэгтүүд

## 📁 Файлууд

```
/Users/rein/ai/aipdf2/
├── html_to_firebase.js           # Үндсэн салгагч код
├── test_extractor.js             # Туршилтын код
├── firebase-config-example.js    # Firebase тохиргооны жишээ
├── package.json                  # Dependencies
└── README_HTML_FIREBASE.md       # Энэ заавар
```

## 🚀 Суулгалт

### 1. Dependencies суулгах

```bash
npm install jsdom
```

### 2. Firebase тохиргоо

```bash
# Жишээ файлыг хуулж Firebase мэдээллээ оруулах
cp firebase-config-example.js firebase-config.js
```

`firebase-config.js` файлд өөрийн Firebase project-ийн мэдээллийг оруулна:

```javascript
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 🔧 Ашиглалт

### 1. Туршилт (Firebase-д хадгалахгүйгээр)

```bash
npm run test-extractor
```

### 2. Firebase-д хадгалах

```bash
npm run extract
```

### 3. Программаар ашиглах

```javascript
import HTMLToFirebaseExtractor from './html_to_firebase.js';

const extractor = new HTMLToFirebaseExtractor();

// HTML файлаас бодлого салгах
const questions = await extractor.extractQuestionsFromHTML(
  '/path/to/exam.html'
);

// Firebase-д хадгалах
const result = await extractor.saveToFirebase('Шалгалтын нэр');
```

## 📊 Өгөгдлийн бүтэц

### Exam Document

```javascript
{
  name: "ЭШ-2025-Математик-A-хувилбар",
  subject: "Математик",
  year: 2025,
  variant: "A",
  totalQuestions: 39,
  multipleChoiceCount: 36,
  fillInCount: 3,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

### Сонгох асуулт

```javascript
{
  id: "mc_1",
  type: "multiple_choice",
  questionNumber: 1,
  questionText: "√√25⁵ илэрхийллийн утгыг олоорой",
  options: [
    { letter: "A", text: "√5" },
    { letter: "B", text: "5" },
    { letter: "C", text: "25" },
    { letter: "D", text: "⁵√5" },
    { letter: "E", text: "1/5" }
  ],
  points: 1,
  section: 1,
  extracted: "2024-01-15T10:30:00.000Z"
}
```

### Нөхөх асуулт

```javascript
{
  id: "fill_2_1",
  type: "fill_in",
  questionNumber: "2.1",
  questionText: "Нөхөх асуултын текст",
  parts: [
    { partNumber: 1, text: "Эхний хэсэг", points: 3 },
    { partNumber: 2, text: "Хоёрдугаар хэсэг", points: 2 },
    { partNumber: 3, text: "Гуравдугаар хэсэг", points: 2 }
  ],
  points: 7,
  section: 2,
  extracted: "2024-01-15T10:30:00.000Z"
}
```

## 🎯 Оноо системd

### Сонгох асуултууд (1-36)
- **1-8 дугаар асуулт**: 1 оноо
- **9-28 дугаар асуулт**: 2 оноо
- **29-36 дугаар асуулт**: 3 оноо

### Нөхөх асуултууд (2.1-2.3)
- **Асуулт бүр**: 7 оноо
- **Хэсэг бүр**: 2-3 оноо

## 📱 Firebase Console

Хадгалсан өгөгдлөө харахын тулд:

```
https://console.firebase.google.com/project/YOUR-PROJECT-ID/firestore
```

## 🔍 Salгах механизм

### 1. HTML файл уншиж авах
- JSDOM ашиглан HTML parse хийх
- Текст контентыг салгах

### 2. Сонгох асуултууд олох
- `1.`, `2.`, `3.` гэх мэт дугаарлалт хайх
- A, B, C, D, E хариултуудыг олох
- Оноо тооцоолох

### 3. Нөхөх асуултууд олох
- `2.1`, `2.2`, `2.3` хэв маяг хайх
- `(1)`, `(2)`, `(3)` хэсгүүдийг олох
- Хэсэг тус бүрийн оноо тооцоолох

### 4. Firebase-д хадгалах
- Exam document үүсгэх
- Questions subcollection-д асуулт бүрийг хадгалах

## ⚠️ Анхаарах зүйлс

- HTML файл нь pdf2htmlEX-ээр үүсгэсэн байх ёстой
- Firebase credentials зөв тохируулсан байх
- Интернет холболт шаардлагатай
- Монгол хэл (UTF-8) дэмжлэгтэй

## 🎉 Үр дүн

✅ HTML файлаас 39 бодлого амжилттай салгана
✅ Firebase Firestore-д бүтэцтэй хадгална
✅ Веб аппликейшнд ашиглахад бэлэн болно
✅ Монгол хэл, математикийн томъёо хадгална