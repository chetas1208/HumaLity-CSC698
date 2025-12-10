
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

## 👥 Team

| Name | Email | Role |
|------|-------|------|
| Chetas Parekh | | |
| Arric Sekhon | | |
| Swastik Amatya | | |

## 📂 Project Structure & Code Explanation

This project is organized into a modern full-stack architecture:

### Backend (Python/FastAPI)
- **`main.py`**: The entry point of the application. It sets up the FastAPI server, handles CORS, serves the static frontend files, and defines API endpoints (`/humanize`, `/detect-ai`).
- **`humanior_client.py`**: Handles the logic for text humanization. It connects to Google's Gemini API using the `google-genai` library to rewrite text based on selected tones.
- **`ai_detector.py`**: A sophisticated local AI detection module. It uses a pre-trained RoBERTa model (`Hello-SimpleAI/chatgpt-detector-roberta`) combined with linguistic analysis (burstiness, perplexity) to determine if text is AI-generated.

### Frontend (React/TypeScript)
- **`src/App.tsx`**: The main component that orchestrates the UI, managing state for input text, humanized output, and detection scores.
- **`src/components/`**: Contains modular UI components.
  - **`ui/`**: Reusable components built with Radix UI and Tailwind CSS (Buttons, Cards, Dialogs, etc.).
  - **`AuthModals.tsx`**: Handles user authentication (Login/Signup) via Firebase.
  - **`ThemeToggle.tsx`**: Allows switching between Dark and Light modes.
- **`src/services/`**: Contains helper functions and API calls (e.g., `history.ts` for managing user history).
- **`src/firebase/config.ts`**: Firebase configuration and initialization.

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

## 💻 How to Run Locally

Follow these comprehensive steps to get the project running on your machine.

### Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Git**

### 1. Clone the Repository
Get the code on your machine:
```bash
git clone https://github.com/chetas1208/CSC698-GenAI_Project.git
cd CSC698-GenAI_Project
```

### 2. Backend Setup
The backend runs on Python and FastAPI.

1.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    ```
2.  **Activate the Environment:**
    - macOS/Linux: `source venv/bin/activate`
    - Windows: `venv\Scripts\activate`
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Set Up Environment Variables:**
    Create a `.env` file in the root directory and add your Google Gemini API key:
    ```env
    GOOGLE_API_KEY=your_actual_api_key_here
    ```
5.  **Start the Server:**
    ```bash
    uvicorn main:app --reload
    ```
    The backend will be available at `http://localhost:8000`.

### 3. Frontend Setup
The frontend is built with React and Vite.

1.  **Open a New Terminal** (keep the backend running in the first one).
2.  **Navigate to the Project Root.**
3.  **Install Node Modules:**
    ```bash
    npm install
    ```
4.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
    The application will open at `http://localhost:5173`.

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
  
