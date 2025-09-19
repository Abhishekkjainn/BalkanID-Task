// src/components/PDFPreview.js

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// THE FIX: Remove '/esm/' from the import paths.
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// This is a required setup step for the library's web worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFPreview({ fileUrl }) {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  // We only want to render the first page as a preview
  return (
    <div className="pdf-preview-container">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="loading-spinner"></div>}
        error={<div>Failed to load PDF preview.</div>}
      >
        <Page pageNumber={1} width={300} /> 
      </Document>
    </div>
  );
}