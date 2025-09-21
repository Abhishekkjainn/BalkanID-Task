// const API_BASE_URL = 'http://localhost:8080'; // Or use an environment variable
const API_BASE_URL = 'https://keyvia-backend.onrender.com';
import { sniffMimeFromBytes } from '../utils/mimeSniff';

// A helper function to handle API responses
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }
  return data;
}

// --- Auth Functions ---
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
}

export async function signup(name, username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password }),
  });
  return handleResponse(response);
}


// --- File Management Functions (Skeletons for now) ---
export async function searchFiles(token, filters = {}) {
  const response = await fetch(`${API_BASE_URL}/api/files/search`, {
    method: 'POST', // FIX: Change from GET to POST
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ filters }),
  });
  return handleResponse(response);
}




/**
 * Uploads files with progress tracking.
 * @param {string} token - The user's JWT token.
 * @param {File[]} files - An array of File objects to upload.
 * @param {function} onProgress - A callback to report progress (0-100).
 * @returns {Promise<object>} - The server's response on completion.
 */
export function uploadFiles(token, files, onProgress) {
  return new Promise(async (resolve, reject) => {
const formData = new FormData();

    // 3. PROCESS FILES ASYNCHRONOUSLY TO READ THEIR BYTES
    for (const file of files) {
      // Create a copy of the file to set the correct MIME type
      let fileToSend = file;

      try {
        // Read the first few bytes of the file for sniffing
        const buffer = await file.slice(0, 128).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const sniffed = sniffMimeFromBytes(bytes);

        // If we sniffed a valid type, use it. Otherwise, use the browser's default.
        const mimeType = sniffed.mime || file.type || 'application/octet-stream';
        
        // Create a new File object with the corrected type.
        // This is crucial for the browser to send the right Content-Type header.
        fileToSend = new File([file], file.name, { type: mimeType });
        console.log(`Uploading '${file.name}' with detected MIME type: ${mimeType}`);

      } catch (e) {
        console.error("Could not sniff MIME type for file:", file.name, e);
      }
      
      formData.append('files', fileToSend);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/files/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total);
        onProgress(percentage);
      }
    };

    xhr.onload = () => {
      const response = JSON.parse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Upload failed'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.send(formData);
  });
}

/**
 * Deletes a file.
 * @param {string} token - The user's JWT token.
 * @param {number} fileId - The ID of the file to delete.
 */
export async function deleteFile(token, fileId) {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
}


/**
 * Shares a file publicly.
 * @param {string} token - The user's JWT token.
 * @param {number} fileId - The ID of the file to share.
 * @returns {Promise<object>} - The server's response with the public link.
 */
export async function shareFilePublicly(token, fileId) {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/share-public`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleResponse(response);
}

/**
 * Shares a file with a specific user.
 * @param {string} token - The user's JWT token.
 * @param {number} fileId - The ID of the file to share.
 * @param {string} shareWithUsername - The username of the recipient.
 * @returns {Promise<object>} - The server's success message.
 */
export async function shareFileWithUser(token, fileId, shareWithUsername) {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/share-with`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ shareWithUsername }),
  });
  return handleResponse(response);
}


/**
 * Fetches user-specific analytics.
 * @param {string} token - The user's JWT token.
 * @returns {Promise<object>} - The analytics data.
 */
export async function getAnalytics(token) {
  const response = await fetch(`${API_BASE_URL}/api/files/analytics`, {
    method: 'POST', // FIX: Change from GET to POST
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
}
// Add this new function to api.js

/**
 * Fetches files shared BY the current user.
 * @param {string} token - The user's JWT token.
 * @returns {Promise<Array>} - An array of file objects shared by the user.
 */
export async function getSharedByMeFiles(token) {
  const response = await fetch(`${API_BASE_URL}/api/files/shared-by-me`, {
    method: 'GET', // As defined in the Go backend
    headers: {
      'Authorization': `Bearer ${token}`, // FIX: Add this header
    },
  });
  return handleResponse(response);
}


/**
 * Fetches the audit log history for the authenticated user.
 * @param {string} token - The user's JWT token.
 * @returns {Promise<Array>} - An array of audit log entry objects.
 */
export async function getAuditLogs(token) {
  const response = await fetch(`${API_BASE_URL}/api/logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`, // FIX: Add this header
    },
  });
  return handleResponse(response);
}


/**
 * Makes a publicly shared file private again.
 * @param {string} token - The user's JWT token.
 * @param {number} fileId - The ID of the file to make private.
 * @returns {Promise<object>} - The server's success message.
 */
export async function makeFilePrivate(token, fileId) {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/share-public`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
}