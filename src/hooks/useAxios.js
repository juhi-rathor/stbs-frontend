"use client";

import { useState, useCallback } from "react";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api/v1";

// Create custom axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically inject token
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("stbs_admin_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function useAxios() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (config) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance(config);
      setData(response.data);
      return response.data;
    } catch (err) {
      const apiError = err.response?.data?.message || err.message || "An unexpected error occurred";
      setError(apiError);
      throw new Error(apiError);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, request };
}
