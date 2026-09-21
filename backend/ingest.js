import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

// HELPER FUNCTION: This forces the script to pause
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processDocument() {
  console.log("1. Loading PDF...");
  const loader = new PDFLoader("./document.pdf");
  const docs = await loader.load();

  console.log("2. Splitting into chunks...");
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  let chunkedDocs = await textSplitter.splitDocuments(docs);
  chunkedDocs = chunkedDocs.filter(chunk => chunk.pageContent.trim().length > 0);
  console.log(`Split into ${chunkedDocs.length} valid chunks.`);

  console.log("3. Initializing Pinecone and Google Embeddings...");
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

  // THE FIX: Use the new model, shrink the dimensions, and explicitly pass the key
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-2-preview", 
    outputDimensionality: 768,          
    apiKey: process.env.GOOGLE_API_KEY, 
  });

  console.log("4. Uploading chunks one by one to avoid rate limits...");
  
  // THE FIX: Loop through manually and wait 2 seconds between each
  for (let i = 0; i < chunkedDocs.length; i++) {
    console.log(`Processing chunk ${i + 1} of ${chunkedDocs.length}...`);
    try {
      await PineconeStore.fromDocuments([chunkedDocs[i]], embeddings, {
        pineconeIndex,
      });
      await delay(2000); // 2000 milliseconds = 2 seconds
    } catch (error) {
      console.error(`Failed on chunk ${i + 1}:`, error.message);
    }
  }

  console.log("Success! Your document is now fully embedded and stored in Pinecone.");
}

processDocument();