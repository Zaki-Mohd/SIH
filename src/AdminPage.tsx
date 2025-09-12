import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AdminPageProps {
  onBackToDashboard: () => void;
}

const ROLES_LIST = [
  'Director', 'HR', 'Procurement', 'Engineer', 'StationController'
];
const DEPARTMENTS_LIST = [
  'Executive', 'HR', 'Procurement', 'Engineering', 'Operations'
];

const AdminPage: React.FC<AdminPageProps> = ({ onBackToDashboard }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [department, setDepartment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'uploading'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleDepartmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartment(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || selectedRoles.length === 0 || !department) {
      setUploadStatus('error');
      setMessage('Please select a PDF file, department, and at least one role.');
      return;
    }

    setIsLoading(true);
    setUploadStatus('uploading');
    setMessage('Uploading and ingesting document...');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);
    formData.append('department', department);
    formData.append('allowedRoles', JSON.stringify(selectedRoles)); // Send as JSON string

    try {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
        // No Content-Type header needed for FormData; browser sets it automatically
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadStatus('success');
        setMessage(data.message || 'Document uploaded and ingested successfully!');
        // Clear form after successful upload
        setSelectedFile(null);
        setSelectedRoles([]);
        setDepartment('');
        // Clear file input visually
        const fileInput = document.getElementById('pdf-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } else {
        setUploadStatus('error');
        setMessage(data.message || 'Failed to upload and ingest document. Please try again.');
      }
    } catch (error: any) {
      setUploadStatus('error');
      setMessage(`Network error or server issue: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-dashboard text-white min-h-screen">
      <div className="bg-glass neon-glow p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center sidebar-logo-text">Upload New Document</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pdf-file" className="block text-lg font-medium text-gray-300 mb-2">
              Select PDF File
            </label>
            <input
              id="pdf-upload-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-gradient-to-r file:from-cyan-500 file:to-purple-600 file:text-white
                         hover:file:opacity-90"
              disabled={isLoading}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-400">Selected: {selectedFile.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="department" className="block text-lg font-medium text-gray-300 mb-2">
              Select Department
            </label>
            <select
              id="department"
              value={department}
              onChange={handleDepartmentChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md bg-black/50 text-white"
              disabled={isLoading}
            >
              <option value="">-- Select a Department --</option>
              {DEPARTMENTS_LIST.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-lg font-medium text-gray-300 mb-2">
              Allowed Roles (Select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES_LIST.map(role => (
                <div key={role} className="flex items-center">
                  <input
                    id={`role-${role}`}
                    type="checkbox"
                    value={role}
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleRoleChange(role)}
                    className="h-4 w-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 bg-black/30"
                    disabled={isLoading}
                  />
                  <label htmlFor={`role-${role}`} className="ml-2 text-sm text-gray-300 cursor-pointer">
                    {role}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !selectedFile || selectedRoles.length === 0 || !department}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            {isLoading ? 'Uploading...' : 'Upload & Ingest PDF'}
          </button>
        </form>

        {uploadStatus !== 'idle' && (
          <div className={`mt-6 p-4 rounded-md text-center flex items-center justify-center gap-2
            ${uploadStatus === 'success' ? 'bg-green-500/20 text-green-300' :
              uploadStatus === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`
          }>
            {uploadStatus === 'success' && <CheckCircle size={20} />}
            {uploadStatus === 'error' && <XCircle size={20} />}
            {uploadStatus === 'uploading' && <Loader2 className="animate-spin" size={20} />}
            <p className="text-sm">{message}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={onBackToDashboard}
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
