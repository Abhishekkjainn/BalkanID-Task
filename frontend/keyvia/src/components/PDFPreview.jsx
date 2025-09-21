import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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