const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api/v1";

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic request handler using the native fetch API
 * @param {string} endpoint - API endpoint (e.g., '/admin/admin-login')
 * @param {object} options - Fetch options (method, body, headers)
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Prepare headers
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Auto-inject JWT token if available in localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("stbs_admin_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Parse JSON safely
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      // If error from backend, extract error message or fallback
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other unexpected errors
    throw new ApiError(error.message || "Network connection error", 500, null);
  }
}

// HTTP helper wrappers
const api = {
  get: (endpoint, headers = {}) => request(endpoint, { method: "GET", headers }),
  post: (endpoint, body = {}, headers = {}) => {
    const isFormData = typeof window !== "undefined" && body instanceof FormData;
    return request(endpoint, {
      method: "POST",
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  },
  put: (endpoint, body = {}, headers = {}) => {
    const isFormData = typeof window !== "undefined" && body instanceof FormData;
    return request(endpoint, {
      method: "PUT",
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  },
  patch: (endpoint, body = {}, headers = {}) => {
    const isFormData = typeof window !== "undefined" && body instanceof FormData;
    return request(endpoint, {
      method: "PATCH",
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  },
  delete: (endpoint, headers = {}) => request(endpoint, { method: "DELETE", headers }),
};

export default api;
