export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: string
}

export interface ApiError {
  message: string
  code: string
  details?: Record<string, unknown>
}
