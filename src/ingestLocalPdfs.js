import { DocumentService } from './services/documentService.js';
import { loadPdfAsDocs } from './utils/pdfLoader.js';
import { splitTextWithMetadata } from './utils/textSplitter.js';

// Sample PDF configurations - update paths as needed
const FILES = [
  { 
    path: './data/director_detailed.pdf', 
    department: 'Director', 
    allowed_roles: ['Director'] 
  },
  { 
    path: './data/hr_detailed.pdf', 
    department: 'HR', 
    allowed_roles: ['HR', 'Director'] 
  },
  { 
    path: './data/procurement_detailed.pdf', 
    department: 'Procurement', 
    allowed_roles: ['Procurement', 'Director'] 
  },
  { 
    path: './data/engineer_detailed.pdf', 
    department: 'Engineering', 
    allowed_roles: ['Engineer', 'Director'] 
  },
  { 
    path: './data/station_controller_detailed.pdf', 
    department: 'Operations', 
    allowed_roles: ['StationController', 'Director'] 
  },
];

async function ingestFile(fileConfig) {
  try {
    console.log(`📄 Processing: ${fileConfig.path}`);
    
    // Load PDF pages
    const docs = await loadPdfAsDocs(fileConfig.path, {
      department: fileConfig.department,
      role_access: fileConfig.allowed_roles,
    });

    // Split large pages into chunks if needed
    const allChunks = [];
    for (const doc of docs) {
      if (doc.pageContent.length > 1500) {
        // Split large pages
        const chunks = await splitTextWithMetadata(
          doc.pageContent, 
          doc.metadata, 
          1000, 
          200
        );
        allChunks.push(...chunks);
      } else {
        allChunks.push(doc);
      }
    }

    // Ingest with role-based access
    await DocumentService.addDocumentsWithTopLevel(allChunks, {
      department: fileConfig.department,
      allowed_roles: fileConfig.allowed_roles,
      source: fileConfig.path
    });

    console.log(`✅ Ingested: ${fileConfig.path} (${allChunks.length} chunks)`);
    return allChunks.length;
  } catch (error) {
    console.error(`❌ Error ingesting ${fileConfig.path}:`, error);
    return 0;
  }
}

async function run() {
  console.log('🚀 Starting PDF ingestion...');
  let totalChunks = 0;
  
  for (const fileConfig of FILES) {
    const chunks = await ingestFile(fileConfig);
    totalChunks += chunks;
    
    // Small delay between files to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`🎉 All PDFs ingested successfully! Total chunks: ${totalChunks}`);
  process.exit(0);
}

// Handle errors gracefully
run().catch(error => {
  console.error('❌ Ingestion failed:', error);
  process.exit(1);
});