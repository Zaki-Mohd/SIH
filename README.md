# Saarthi - KMRL Role-Aware RAG Prototype

A comprehensive document intelligence and briefing assistant for Kochi Metro Rail Limited (KMRL) built with LangChain.js, Supabase (pgvector), and Google Gemini.

## Features

### 🔐 Role-Based Access Control
- **Station Controller**: Operations, incidents, maintenance, staffing
- **Engineer**: Technical issues, vendor bulletins, equipment status  
- **Procurement Officer**: Contracts, POs, compliance, vendor management
- **HR Officer**: Policies, training, safety, staff management
- **Director**: High-level KPIs, strategic updates, cross-department insights

### 🤖 AI-Powered Capabilities
- **Smart Document Retrieval**: Role-filtered similarity search using pgvector
- **Citation Tracking**: Every answer includes verifiable source references
- **"Why Button"**: Root cause analysis and document connection insights
- **Daily Briefings**: Automated role-specific summaries
- **Predictive Alerts**: Risk scanning across compliance and safety documents

### 🏗️ Technical Architecture
- **Frontend**: React with Tailwind CSS, role-based UI with avatar selection
- **Backend**: Node.js server with REST API endpoints
- **AI/ML**: Google Gemini (text-embedding-004 + gemini-1.5-flash)
- **Vector Database**: Supabase with pgvector extension (768-dimensional embeddings)
- **Document Processing**: LangChain.js with PDF parsing and intelligent chunking

## Quick Start

### 1. Prerequisites
- Node.js 18+ 
- Supabase account with pgvector extension
- Google Gemini API key

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Add your keys:
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_PROJECT_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### 3. Database Setup
Run the SQL schema in your Supabase SQL Editor:
```bash
# The schema is in supabase-schema.sql
# This creates tables, RLS policies, and vector search functions
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Prepare Sample Documents
Create a `data/` folder and add your PDF files:
```
data/
├── director_detailed.pdf
├── hr_detailed.pdf  
├── procurement_detailed.pdf
├── engineer_detailed.pdf
└── station_controller_detailed.pdf
```

### 6. Ingest Documents
```bash
npm run ingest
```

### 7. Start the System
```bash
# Start both server and frontend
npm run dev:full

# Or separately:
npm run server  # Backend on port 3001
npm run dev     # Frontend on port 5173
```

## API Endpoints

### Chat
```http
POST /api/chat
Content-Type: application/json

{
  "question": "What training is scheduled this month?",
  "role": "HR",
  "filter": {} // optional metadata filter
}
```

### Why Button
```http
POST /api/why
Content-Type: application/json

{
  "question": "Previous question",
  "role": "HR", 
  "docs": [/* retrieved documents */]
}
```

### Daily Briefings
```http
GET /api/briefings?role=Director
```

### Predictive Alerts
```http
GET /api/alerts?role=Director
```

## Architecture Details

### Vector Search (768 dimensions)
- Uses Google's `text-embedding-004` model
- Stored in Supabase pgvector with cosine similarity
- Role-filtered retrieval via RLS and custom RPC functions

### Document Processing Pipeline
1. **PDF Loading**: Extract text with page metadata
2. **Chunking**: Split large documents (1000 chars, 200 overlap)
3. **Embedding**: Generate 768-dim vectors via Gemini
4. **Storage**: Insert with role permissions and metadata
5. **Indexing**: IVFFlat index for fast similarity search

### Security & Privacy
- Row Level Security (RLS) policies
- Role-based document filtering
- Service key for server operations
- Audit trail with source attribution

## Customization

### Adding New Roles
1. Update `ROLES` in `App.tsx`
2. Add role to database schema check constraint
3. Configure role-specific briefing questions
4. Update ingestion scripts with new role permissions

### Adding Document Sources
1. Extend `ingestLocalPdfs.js` with new file configurations
2. Update metadata schema as needed
3. Configure role permissions for new document types

### Extending AI Capabilities
- **Hybrid Search**: Add keyword search with pg_trgm
- **Multilingual**: Add Malayalam translation layers
- **Advanced RAG**: Implement reranking and query expansion
- **External APIs**: Connect SharePoint, Gmail, or other systems

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
GEMINI_API_KEY=prod_key
SUPABASE_PROJECT_URL=prod_url
SUPABASE_SERVICE_KEY=prod_service_key
```

### Scaling Considerations
- **Vector Index Tuning**: Adjust `lists` parameter based on document count
- **Caching**: Add Redis for frequent queries
- **Rate Limiting**: Implement API rate limiting
- **Monitoring**: Add logging and performance metrics

## Development Roadmap

- [ ] **SharePoint Integration**: Direct document sync
- [ ] **Gmail Connector**: Email and attachment processing  
- [ ] **Malayalam Support**: Bidirectional translation
- [ ] **Advanced Analytics**: Usage dashboards and insights
- [ ] **Mobile App**: React Native companion
- [ ] **Workflow Integration**: KMRL internal systems

## Support

For technical issues or feature requests, refer to the implementation details in the codebase or extend the existing services following the established patterns.

## License

Internal KMRL prototype - not for external distribution.