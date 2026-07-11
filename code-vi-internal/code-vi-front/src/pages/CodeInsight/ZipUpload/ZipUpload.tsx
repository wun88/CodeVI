import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import { zipAnalysisService } from '../../../services/zipAnalysisService';
import './ZipUpload.css';

function ZipUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      setUploadedFile(file);
    } else {
      alert('ZIP 파일만 업로드 가능합니다.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const repoName = uploadedFile.name.replace(/\.zip$/i, '');
      // 1회성(비영속) 분석: zip → parser AST. DB 저장 없음.
      const result = await zipAnalysisService.analyzeZip(uploadedFile, repoName, setUploadProgress);

      // 결과를 세션에 담아 대시보드로 전달 (대형 결과는 quota 초과 가능 → 실패해도 이동은 계속)
      try {
        sessionStorage.setItem(
          'zipAnalysisResult',
          JSON.stringify({ repoName, analyzedAt: new Date().toISOString(), result }),
        );
      } catch {
        console.warn('zipAnalysisResult가 sessionStorage 용량을 초과해 저장을 건너뜀');
      }
      navigate('/code-insight/dashboard');
    } catch (err: any) {
      alert('분석 실패: ' + (err.response?.data?.message ?? err.message));
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  return (
    <div className="zip-upload-page">
      <Header variant="internal" />
      <main className="zip-upload-content">
        <button className="back-btn" onClick={() => navigate('/code-insight')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          돌아가기
        </button>

        <div className="zip-upload-header">
          <h1>ZIP 파일 업로드</h1>
          <p>프로젝트 폴더를 ZIP 파일로 압축하여 업로드하세요</p>
        </div>

        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${uploadedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!uploadedFile ? handleUploadClick : undefined}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".zip"
            hidden
          />

          {!uploadedFile ? (
            <>
              <div className="dropzone-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7492B7" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="dropzone-text">
                ZIP 파일을 드래그하여 놓거나
                <br />
                <span className="browse-text">클릭하여 파일 선택</span>
              </p>
              <p className="dropzone-hint">최대 100MB까지 업로드 가능</p>
            </>
          ) : (
            <div className="uploaded-file-info">
              <div className="file-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#7492B7">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8" fill="none" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="file-details">
                <p className="file-name">{uploadedFile.name}</p>
                <p className="file-size">{formatFileSize(uploadedFile.size)}</p>
              </div>
              {!isUploading && (
                <button className="remove-file-btn" onClick={handleRemoveFile}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          )}

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="progress-text">분석 중... {uploadProgress}%</p>
            </div>
          )}
        </div>

        {uploadedFile && !isUploading && (
          <button className="analyze-btn" onClick={handleAnalyze}>
            코드 분석 시작
          </button>
        )}

        <div className="upload-tips">
          <h3>업로드 가이드</h3>
          <ul>
            <li>프로젝트 루트 폴더를 ZIP으로 압축해주세요</li>
            <li>node_modules, .git 등 불필요한 폴더는 제외하면 더 빠릅니다</li>
            <li>지원 언어: JavaScript, TypeScript, Python, Java, C++</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default ZipUpload;
