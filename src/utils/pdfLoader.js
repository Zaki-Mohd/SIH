import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

export async function loadPdfAsDocs(filePath, baseMeta = {}) {
  const loader = new PDFLoader(filePath, {
    splitPages: true,
    parsedItemSeparator: '\n',
  });
  const pages = await loader.load();
  // Add page/source metadata
  return pages.map((p, i) => ({
    pageContent: p.pageContent,
    metadata: {
      ...baseMeta,
      source: filePath,
      page: (p.metadata?.loc?.pageNumber ?? i + 1),
      mimetype: 'application/pdf'
    }
  }));
}