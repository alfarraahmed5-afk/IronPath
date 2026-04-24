// Standard API response shapes

export interface PaginationMeta {
  cursor: string | null;
  has_more: boolean;
  limit: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface ApiListResponse<T> {
  data: {
    items: T[];
    total?: number;
  };
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
    fields?: Array<{ field: string; message: string }>;
  };
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    gym_id: string;
  };
}

export interface RegisterRequest {
  invite_code: string;
  email: string;
  password: string;
  username: string;
  full_name?: string;
  sex?: 'male' | 'female';
  date_of_birth?: string;
}

export interface GymRegisterRequest {
  name: string;
  location?: string;
  description?: string;
  email: string;
  password: string;
}
