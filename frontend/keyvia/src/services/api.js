const API_BASE_URL = 'http://localhost:8080';

// --- Auth Functions (Unchanged) ---
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to login');
  return data;
}

export async function signup(name, username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to sign up');
  return data;
}

