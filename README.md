
# Humality - AI Text Humanizer

![Humality Banner](https://via.placeholder.com/1200x400?text=Humality+AI+Text+Humanizer)

**Humality** is a cutting-edge platform designed to bridge the gap between artificial intelligence and authentic human expression. It transforms robotic, AI-generated content into natural, engaging, and undetectable human-like text.

Whether you are a content creator, student, or professional, Humality ensures your writing resonates with your audience while bypassing AI detection systems.

## 🚀 Features

### ✍️ Advanced Text Humanization
- **Smart Rewriting:** Sophisticated algorithms analyze and rewrite text to improve flow, vocabulary, and sentence structure.
- **Multiple Tones:** Choose from 5 distinct writing styles to match your needs:
  - **Natural:** Balanced and authentic (Default).
  - **Casual:** Friendly and relaxed for social media or blogs.
  - **Professional:** Polished and formal for business communication.
  - **Creative:** Expressive and unique for storytelling.
  - **Concise:** Clear and to-the-point.

### 🔍 Integrated AI Detection
- **Real-time Analysis:** Instantly analyzes your input text to detect AI probability.
- **Before & After Comparison:** See the AI score drop significantly after humanization.
- **Detailed Breakdown:** Visual highlights show which parts of the text appear artificial (High, Medium, Low, Human).

### 🎨 Modern & Responsive UI
- **Glassmorphism Design:** A sleek, modern interface with frosted glass effects and animated backgrounds.
- **Dark/Light Mode:** Fully supported theme toggling with system preference detection.
- **Responsive:** Optimized for seamless use on mobile, tablet, and desktop devices.

### 👤 User Experience
- **History Management:** Sign in to save your conversions and access them later.
- **Authentication:** Secure login via Email/Password or Google Sign-In (Firebase).
- **One-Click Copy:** Easily copy your humanized text to the clipboard.
- **Feedback System:** Rate the quality of outputs to help improve the system.

## 🛠️ Tech Stack

### Frontend
- **Framework:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v4)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Components:** [Radix UI](https://www.radix-ui.com/) primitives
- **State/Theme:** `next-themes`, `sonner` (toast notifications)

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **Server:** [Uvicorn](https://www.uvicorn.org/)
- **Language:** Python 3.x

### Services
- **Database & Auth:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/chetas1208/CSC698-GenAI_Project.git
cd CSC698-GenAI_Project
```

### 2. Backend Setup
Navigate to the project root (where `main.py` is located).

```bash
# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```
The backend will start at `http://localhost:8000`.

### 3. Frontend Setup
Open a new terminal and navigate to the project root.

```bash
# Install Node dependencies
npm install

# Start the development server
npm run dev
```
The frontend will start at `http://localhost:5173` (or similar).

### 4. Environment Variables
Create a `.env` file in the root directory if needed for custom configurations (e.g., API keys, Firebase config).
*Note: Firebase config is currently embedded in `src/firebase/config.ts`.*

## 🚀 Usage

1.  **Enter Text:** Paste your AI-generated content into the left input box.
2.  **Check Detection:** The system will automatically analyze the AI probability of your input.
3.  **Select Tone:** Choose a tone (Natural, Casual, Professional, etc.) from the top bar.
4.  **Humanize:** Click the **"Humanize Text"** button.
5.  **Review:** View the transformed text on the right, complete with a new AI detection score.
6.  **Copy/Save:** Copy the result or sign in to save it to your history.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/YourFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Created by Chetas Parekh, Arric Sekkhon & Swastik Amatya** for CSC698 GenAI Project.
  
