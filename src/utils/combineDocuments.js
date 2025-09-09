export function combineDocuments(docs) {
  return docs
    .map((doc, i) => {
      const source = doc.metadata?.source || 'Unknown';
      const page = doc.metadata?.page || 'N/A';
      return `[Source ${i + 1}: ${source} p.${page}]\n${doc.pageContent}`;
    })
    .join('\n\n---\n\n');
}