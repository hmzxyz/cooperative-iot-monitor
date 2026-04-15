import axios from 'axios';

// The API root URL can be configured in frontend/.env.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  full_name: string;
};

export type UserProfile = {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
};

export type SensorReading = {
  id: number;
  temperature: number;
  pressure: number;
  milk_weight: number;
  alert: string | null;
  topic: string;
  payload: Record<string, unknown>;
  received_at: string;
};

/**
 * Send login credentials to the backend and receive a JWT token.
 */
export async function login(payload: LoginRequest) {
  const formData = new URLSearchParams();
  formData.set('username', payload.email);
  formData.set('password', payload.password);

  const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
  return response.data;
}

/**
 * Register a new user with the backend.
 */
export async function register(payload: RegisterRequest) {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, payload);
  return response.data;
}

/**
 * Fetch the current logged-in user profile.
 */
export async function getCurrentUser(token: string | null) {
  if (!token) {
    throw new Error('Unauthorized');
  }

  const response = await axios.get(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data as UserProfile;
}

/**
 * Load recent sensor readings from the backend.
 */
export async function getSensorReadings(token: string | null) {
  if (!token) {
    throw new Error('Unauthorized');
  }

  const response = await axios.get(`${API_BASE_URL}/sensors`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data as SensorReading[];
}
