import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { llm } from '../utils/llm.js';
import { combineDocuments } from '../utils/combineDocuments.js';
import { standaloneQuestionPrompt, answerPrompt, whyPrompt } from '../utils/prompts.js';
import { DocumentService } from './documentService.js';

export class RAGService {
  constructor() {
    this.setupChains();
  }

  setupChains() {
    this.standaloneQuestionChain = standaloneQuestionPrompt.pipe(llm).pipe(new StringOutputParser());
    this.answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());
    this.whyChain = whyPrompt.pipe(llm).pipe(new StringOutputParser());
  }

  async retrieve(question, k, role, filter = {}) {
    // Role-aware similarity via our DocumentService
    return DocumentService.similaritySearch(question, k, filter, role);
  }

  async ask({ question, role, filter = {}, k = 4 }) {
    try {
      // Generate standalone question
      const standalone = await this.standaloneQuestionChain.invoke({ question });
      
      // Retrieve relevant documents
      const docs = await this.retrieve(standalone, k, role, filter);
      
      if (!docs.length) {
        return {
          answer: "I don't have access to relevant documents for this question in your role.",
          sources: [],
          retrieved: []
        };
      }

      // Generate context and get answer
      const context = combineDocuments(docs);
      const answer = await this.answerChain.invoke({ context, question });
      
      const sources = docs.slice(0, Math.min(k, 3)).map(d => ({
        source: d.metadata?.source ?? 'unknown',
        page: d.metadata?.page ?? null
      }));

      return { answer, sources, retrieved: docs };
    } catch (error) {
      console.error('RAGService.ask error:', error);
      return {
        answer: "I encountered an error processing your question. Please try again.",
        sources: [],
        retrieved: []
      };
    }
  }

  async why({ question, role, docs }) {
    try {
      if (!docs?.length) {
        return { why: "No documents were retrieved for analysis.", evidence: [] };
      }

      const snippets = docs.map(d => 
        `(${d.metadata?.source || 'unknown'} p.${d.metadata?.page || 'N/A'}) :: ${d.pageContent.slice(0, 300)}...`
      ).join('\n---\n');

      // Get the explanation from the LLM
      const explanation = await this.whyChain.invoke({ question, snippets });

      // Extract evidence from the original documents
      const evidence = docs.map(d => ({
        source: d.metadata?.source ?? 'unknown',
        page: d.metadata?.page ?? null
      }));

      return { why: explanation, evidence: evidence };

    } catch (error) {
      console.error('RAGService.why error:', error);
      return { why: "Error generating explanation.", evidence: [] };
    }
  }
}
