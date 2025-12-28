import React, { useState, useRef } from 'react';
import { Icon } from './ui/Icons';
import './ResumeUpload.css';

/**
 * Resume Upload Component
 * Allows users to upload their existing resume (PDF, DOCX, TXT)
 */
function ResumeUpload({ onUpload, onCancel }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain' // .txt
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  function handleFileSelect(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');

    // Validate file type
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Please upload a PDF, DOCX, DOC, or TXT file.');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 10MB.');
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(e) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileSelect(fakeEvent);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  async function handleUpload() {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Read file as base64 or text
      const fileData = await readFile(file);
      
      // Call the upload handler with file data
      if (onUpload) {
        await onUpload({
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          data: fileData
        });
      }
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Failed to read file. Please try again.');
      setIsUploading(false);
    }
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };

      // Read as text for TXT files, data URL for others
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileTypeLabel(type) {
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('wordprocessingml')) return 'DOCX';
    if (type === 'application/msword') return 'DOC';
    if (type === 'text/plain') return 'TXT';
    return 'File';
  }

  return (
    <div className="resume-upload">
      <div className="upload-area">
        <div
          className={`drop-zone ${file ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          {!file ? (
            <>
              <div className="upload-icon">
                <Icon name="file" size={48} />
              </div>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">
                PDF, DOCX, DOC, or TXT (max 10MB)
              </p>
            </>
          ) : (
            <>
              <div className="file-info">
                <div className="file-icon">📎</div>
                <div className="file-details">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    {getFileTypeLabel(file.type)} • {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  className="btn-remove-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="upload-error">{error}</div>
        )}

        <div className="upload-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Resume'}
          </button>
        </div>
      </div>

      <div className="upload-info">
        <p className="info-title">What happens next?</p>
        <ul className="info-list">
          <li>We'll extract your resume information automatically</li>
          <li>You can review and edit the extracted data</li>
          <li>Your resume will be saved to your master resume</li>
        </ul>
      </div>
    </div>
  );
}

export default ResumeUpload;

