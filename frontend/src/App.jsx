import { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://rag-backend-hn8k.onrender.com';

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAnswer("");

    try {
      const response = await axios.post(`${API_URL}/api/chat`, { question });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error(error);
      setAnswer("Error connecting to the server. Set VITE_API_URL to your deployed backend URL.");
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", fontFamily: "sans-serif" }}>
      <h1>📄 AI Document Chat</h1>
      <form onSubmit={askQuestion} style={{ display: "flex", gap: "10px" }}>
        <input 
          type="text" 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)} 
          placeholder="Ask a question about the document..." 
          style={{ flex: 1, padding: "10px", fontSize: "16px" }}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: "10px 20px" }}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>
      
      {answer && (
        <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f4f4f9", borderRadius: "8px" }}>
          <strong>Answer:</strong>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;