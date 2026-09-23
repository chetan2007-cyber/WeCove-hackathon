import axios from 'axios';

// Detect whether running locally or deployed in cloud (e.g. Vercel)
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running in production on Vercel or any non-localhost domain:
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
        return process.env.REACT_APP_API_URL;
      }
      return 'https://wecove-hackathon.onrender.com/api';
    }
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?._id || user?.id) {
          config.headers['x-user-id'] = user._id || user.id;
        }
        if (user?.role) {
          config.headers['x-user-role'] = user.role;
        }
      }
    } catch (e) {
      console.warn('Could not read auth token from storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = 'An unexpected error occurred. Please try again.';

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        friendlyMessage = 'Request timed out. The server may be waking up. Please try again in a moment.';
      } else {
        friendlyMessage = 'Unable to connect to live server. Operating in offline-resilient mode.';
      }
    } else {
      const { status, data } = error.response;
      if (data?.message) {
        friendlyMessage = data.message;
      } else if (status === 401) {
        friendlyMessage = 'Your session has expired. Please log in again.';
        localStorage.removeItem('token');
      } else if (status === 403) {
        friendlyMessage = 'Access denied. You do not have permission for this patient record.';
      } else if (status === 404) {
        friendlyMessage = 'The requested resource was not found.';
      } else if (status === 429) {
        friendlyMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (status >= 500) {
        friendlyMessage = 'Server error. Our team has been notified.';
      }
    }

    const enhancedError = new Error(friendlyMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    return Promise.reject(enhancedError);
  }
);

export default apiClient;
