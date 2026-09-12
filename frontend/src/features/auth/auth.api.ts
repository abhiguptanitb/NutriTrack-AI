import { apiRequest } from "@/api/client";
import type { AuthResponse, AuthUser } from "./auth.types";

export function registerUser(input: { name: string; email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function loginUser(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getCurrentUser() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}
