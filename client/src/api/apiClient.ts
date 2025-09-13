import axios from 'axios';
import { getAuthToken } from './queryClient';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      // Standardize error message
      error.message = error.response.data?.message || error.response.data?.error || error.message;
    }
    return Promise.reject(error);
  }
);

export function extractData<T>(promise: Promise<{ data: any }>): Promise<T> {
  return promise.then((r) => r.data as T);
}
