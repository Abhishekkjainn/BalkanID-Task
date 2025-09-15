// Minimal client-side MIME sniffing using magic numbers
// This is not exhaustive but covers common types for validation hints.

function bytesStartsWith(bytes, signature) {
    return signature.every((b, i) => bytes[i] === b);
}

export function sniffMimeFromBytes(bytes) {
    if (!bytes || bytes.length < 4) return { mime: '' };

    // PNG
    if (bytesStartsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
        return { mime: 'image/png' };
    }
    // JPEG
    if (bytesStartsWith(bytes, [0xFF, 0xD8, 0xFF])) {
        return { mime: 'image/jpeg' };
    }
    // GIF87a or GIF89a
    if (bytesStartsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
        return { mime: 'image/gif' };
    }
    // PDF
    if (bytesStartsWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
        return { mime: 'application/pdf' };
    }
    // ZIP-based formats: ZIP (PK\x03\x04) used by docx, xlsx, pptx, jar, etc.
    if (bytesStartsWith(bytes, [0x50, 0x4B, 0x03, 0x04])) {
        return { mime: 'application/zip' };
    }
    // MP4
    if (bytes.length > 11 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        return { mime: 'video/mp4' };
    }
    // WebP (RIFF....WEBP)
    if (bytesStartsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return { mime: 'image/webp' };
    }
    // Plain text heuristic: check for mostly printable ASCII in first bytes
    let printable = 0;
    const len = Math.min(bytes.length, 64);
    for (let i = 0; i < len; i++) {
        const c = bytes[i];
        if (c === 0) break; // likely binary
        if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126)) printable++;
    }
    if (printable / len > 0.9) {
        return { mime: 'text/plain' };
    }
    return { mime: '' };
}


