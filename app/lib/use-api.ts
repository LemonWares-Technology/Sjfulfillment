"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiRequestInit extends Omit<RequestInit, 'cache'> {
  silent?: boolean;
  cache?: boolean;
  cacheTTL?: number;
}

export function useApi() {
  const [loading, setLoading] = useState(false);

  const request = async <T = any>(
    url: string,
    options: ApiRequestInit = {}
  ): Promise<T> => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const { cache, cacheTTL, silent, ...fetchOptions } = options;
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...(token && { Authorization: `Bearer ${token}` }),
          ...fetchOptions.headers,
        },
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to unauthorized page for 401 errors
          window.location.href = '/unauthorized';
          throw new Error('Unauthorized');
        }
        throw new Error(data.error || "Request failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Request failed");
      }

      return data.data as T;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      console.error("API Error:", errorMessage);
      
      // Handle 401 unauthorized errors
      if (error instanceof Error && error.message.includes('401')) {
        // Redirect to unauthorized page
        window.location.href = '/unauthorized';
        throw error;
      }
      
      // Only show toast for non-array requests to avoid spam
      if (!options.silent) {
        toast.error(errorMessage);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const get = <T = any>(url: string, options?: ApiRequestInit) =>
    request<T>(url, { ...options, method: 'GET' });

  const post = <T = any>(url: string, data?: any) =>
    request<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });

  const put = <T = any>(url: string, data?: any) =>
    request<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });

  const del = <T = any>(url: string) =>
    request<T>(url, {
      method: "DELETE",
    });

  // Alias for backward compatibility
  const callApi = request;

  return {
    loading,
    request,
    callApi, // Added this
    get,
    post,
    put,
    delete: del,
  };
}
