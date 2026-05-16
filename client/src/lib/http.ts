import axios from "axios";
import { API_URL } from "./api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export function authConfig(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export function getRequestErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;

    return data?.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
