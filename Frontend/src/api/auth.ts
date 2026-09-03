import { api } from './client'
import type { LoginRequest, LoginResponse } from '../types/auth'

export function login(data: LoginRequest) {
  return api.post<LoginResponse>('/api/Auth/login', data)
}
