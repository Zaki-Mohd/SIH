import { vectorStore } from '../utils/vectorStore.js';
import { embeddings } from '../utils/embeddings.js';

export class DocumentService {
  static async addDocuments(documents) {
    await vectorStore.addDocuments(documents);
    return { success: true, count: documents.length };
  }

  // Add docs with top-level columns (roles/department) using manual insert
  static async addDocumentsWithTopLevel(documents, top = {}) {
    try {
      // 1) Generate embeddings
      const texts = documents.map(d => d.pageContent);
      const metas = documents.map(d => d.metadata);
      const vectors = await embeddings.embedDocuments(texts);

      // 2) Prepare rows for batch insert
      const rows = vectors.map((vec, i) => ({
        content: texts[i],
        metadata: metas[i],
        embedding: JSON.stringify(vec), // Convert to JSON string for RPC
        source: top.source || metas[i]?.source || null,
        page: metas[i]?.page ?? null,
        department: top.department ?? metas[i]?.department ?? null,
        allowed_roles: top.allowed_roles ?? metas[i]?.role_access ?? [],
      }));

      // 3) Insert via RPC to handle vector conversion
      const { data, error } = await vectorStore.client.rpc('insert_documents_batch', {
        rows: rows
      });
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      return { success: true, count: rows.length };
    } catch (error) {
      console.error('DocumentService.addDocumentsWithTopLevel error:', error);
      throw error;
    }
  }

  static async similaritySearch(query, k = 4, filter = {}, role = null) {
    try {
      const embedding = await embeddings.embedQuery(query);
      const { data, error } = await vectorStore.client.rpc('match_documents', {
        query_embedding: embedding,
        match_count: k,
        filter,
        role
      });
      
      if (error) {
        console.error('Similarity search error:', error);
        throw error;
      }
      
      // Convert to LangChain-like documents
      return (data || []).map(r => ({
        pageContent: r.content,
        metadata: {
          ...r.metadata,
          source: r.source,
          page: r.page,
        },
        score: r.similarity,
      }));
    } catch (error) {
      console.error('DocumentService.similaritySearch error:', error);
      throw error;
    }
  }
}