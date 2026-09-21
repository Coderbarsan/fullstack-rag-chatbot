import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";

async function askQuestion(question) {
  console.log("1. Connecting to Pinecone...");
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-2-preview", 
    outputDimensionality: 768,          
  });

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
  });

  console.log("2. Initializing the Gemini Chat AI...");
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash", 
    temperature: 0, 
  });

  console.log("3. Retrieving context from Pinecone...");
  // STEP A: Manually search Pinecone for the 3 most relevant flashcards
  const retriever = vectorStore.asRetriever(3);
  const retrievedDocs = await retriever.invoke(question);
  
  // STEP B: Extract the text from those flashcards and join them together with dashes
  const contextText = retrievedDocs.map(doc => doc.pageContent).join("\n\n---\n\n");

  console.log("4. Asking Gemini...");
  // STEP C: Build a standard string prompt with our context injected
  const prompt = `
    You are a helpful assistant. Use the following pieces of retrieved context to answer the question.
    If you don't know the answer based on the context, just say "I don't know." Do not make up information.
    
    Context: 
    ${contextText}
    
    Question: ${question}
    
    Answer:
  `;

  console.log(`\nUser Question: "${question}"`);
  console.log("Thinking...\n");
  
  // Send the final prompt directly to the LLM
  const response = await llm.invoke(prompt);
  
  console.log("--- AI ANSWER ---");
  console.log(response.content); 
}

askQuestion("What is the applicant's name and what are they studying?");