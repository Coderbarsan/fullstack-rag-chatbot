import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://coderbarsan.github.io",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME || !process.env.GOOGLE_API_KEY) {
  console.warn("Missing required environment variables. Add PINECONE_API_KEY, PINECONE_INDEX_NAME, and GOOGLE_API_KEY before starting the server.");
}

// Initialize AI & DB once when the server starts
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME || "");
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2-preview",
  apiKey: process.env.GOOGLE_API_KEY,
  outputDimensionality: 768,
});
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.6-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Question is required." });
    }

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
    const retriever = vectorStore.asRetriever(3);
    const retrievedDocs = await retriever.invoke(question);

    const contextText = retrievedDocs.map(doc => doc.pageContent).join("\n\n---\n\n");

    const prompt = `
      You are a helpful assistant. Use the following pieces of retrieved context to answer the question.
      If you don't know the answer, just say "I don't know." Do not make up information.
      Context: ${contextText}
      Question: ${question}
      Answer:
    `;

    const response = await llm.invoke(prompt);
    return res.json({ answer: response.content });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong in the backend." });
  }
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));