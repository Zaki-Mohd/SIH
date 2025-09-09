import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export function splitTextWithMetadata(text, metadata = {}, chunkSize = 1000, chunkOverlap = 200) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  
  return splitter.createDocuments([text], [metadata]);
}