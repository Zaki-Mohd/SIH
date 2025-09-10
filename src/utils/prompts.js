import { PromptTemplate } from '@langchain/core/prompts';

export const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  `Rewrite the user's query as a standalone question.\nquestion: {question}\nstandalone question:`
);

export const answerPrompt = PromptTemplate.fromTemplate(
  `You are Saarthi, a concise assistant for KMRL (Kochi Metro Rail Limited).
Answer ONLY from the context provided in 2-5 sentences. If the information is not found, say:
"I'm sorry, I don't know the answer to that based on the available documents."

Context:
{context}

Question: {question}

Answer:`
);

export const whyPrompt = PromptTemplate.fromTemplate(
  `You are an expert analyst. Your job is to look at the provided document snippets and the user's question and explain WHY the snippets are relevant to the user's question in 1-2 sentences.

Snippets:
{snippets}

Question: {question}

Explanation:`
);
