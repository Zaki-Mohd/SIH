import { DocumentService } from './documentService.js';
import { loadPdfAsDocs } from '../utils/pdfLoader.js';
import { splitTextWithMetadata } from '../utils/textSplitter.js';
import path from 'path'; // Import path module for absolute paths
import fs from 'fs'; // Import fs module to check file existence

// The core ingestion logic, now exportable
export async function ingestFile(filePath, department, allowedRoles) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    console.log(`📄 Processing: ${filePath} for Department: ${department}, Roles: ${allowedRoles.join(', ')}`);

    // Load PDF pages
    const docs = await loadPdfAsDocs(filePath, {
      department: department,
      role_access: allowedRoles,
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
      department: department,
      allowed_roles: allowedRoles,
      source: path.basename(filePath) // Store just the filename as source
    });

    console.log(`✅ Successfully ingested: ${filePath}`);
    return { success: true, message: `Successfully ingested: ${filePath}` };
  } catch (error) {
    console.error(`❌ Error ingesting ${filePath}:`, error);
    return { success: false, message: `Error ingesting ${filePath}: ${error.message}` };
  }
}

// Original CLI ingestion logic (can remain for initial setup/testing)
const FILES = [
  {
    path: './data/director_detailed.pdf',
    department: 'Director',
    allowed_roles: ['Director', 'Engineer', 'HR', 'Procurement', 'StationController']
  },
  {
    path: './data/hr_detailed.pdf',
    department: 'HR',
    allowed_roles: ['HR', 'Director', 'Engineer', 'Procurement', 'StationController']
  },
  {
    path: './data/procurement_detailed.pdf',
    department: 'Procurement',
    allowed_roles: ['Procurement', 'Director', 'Engineer', 'HR', 'StationController']
  },
  {
    path: './data/engineer_detailed.pdf',
    department: 'Engineering',
    allowed_roles: ['Engineer', 'Director', 'HR', 'Procurement', 'StationController']
  },
  {
    path: './data/station_controller_detailed.pdf',
    department: 'Operations',
    allowed_roles: ['StationController', 'Director', 'Engineer', 'HR', 'Procurement']
  },
];

export async function runCliIngestion() {
  console.log('Starting local PDF ingestion...');
  for (const fileConfig of FILES) {
    // Ensure the path is correct for CLI context
    await ingestFile(fileConfig.path, fileConfig.department, fileConfig.allowed_roles);
  }
  console.log('Local PDF ingestion complete.');
}

// If this file is run directly (e.g., via npm run ingest)
if (process.argv[1] && process.argv[1].endsWith('ingestionService.js')) {
  runCliIngestion();
}
