import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import toast from 'react-hot-toast'

import { authAPI } from '../../services/api'
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthTokens,
  AuthState 
} from '../../types/auth'

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials)
      
      // Store tokens in localStorage
      if (response.data.tokens) {
        localStorage.setItem('accessToken', response.data.tokens.access)
        localStorage.setItem('refreshToken', response.data.tokens.refresh)
      }
      
      toast.success('Welcome back!')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData)
      
      // Store tokens in localStorage
      if (response.data.tokens) {
        localStorage.setItem('accessToken', response.data.tokens.access)
        localStorage.setItem('refreshToken', response.data.tokens.refresh)
      }
      
      toast.success('Account created successfully!')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout()
      
      // Clear tokens from localStorage
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      
      toast.success('Logged out successfully')
      return null
    } catch (error: any) {
      // Even if logout fails on server, clear local tokens
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      
      const message = error.response?.data?.message || 'Logout failed'
      return rejectWithValue(message)
    }
  }
)

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = localStorage.getItem('accessToken')
      
      if (!accessToken) {
        return rejectWithValue('No access token found')
      }
      
      const response = await authAPI.getProfile()
      return response.data
    } catch (error: any) {
      // If token is invalid, try to refresh
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (refreshToken) {
        try {
          const refreshResponse = await authAPI.refreshToken(refreshToken)
          localStorage.setItem('accessToken', refreshResponse.data.accessToken)
          
          // Retry getting profile
          const profileResponse = await authAPI.getProfile()
          return profileResponse.data
        } catch (refreshError) {
          // Refresh failed, clear tokens
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          return rejectWithValue('Authentication failed')
        }
      }
      
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return rejectWithValue('Authentication failed')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updateData: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(updateData)
      toast.success('Profile updated successfully!')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    passwordData: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await authAPI.changePassword(passwordData)
      toast.success('Password changed successfully!')
      return null
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password change failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await authAPI.forgotPassword(email)
      toast.success('Password reset email sent!')
      return null
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (
    resetData: { token: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      await authAPI.resetPassword(resetData)
      toast.success('Password reset successfully!')
      return null
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password reset failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload
      localStorage.setItem('accessToken', action.payload.access)
      localStorage.setItem('refreshToken', action.payload.refresh)
    },
    clearTokens: (state) => {
      state.tokens = null
      state.isAuthenticated = false
      state.user = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    setInitialized: (state) => {
      state.isInitialized = true
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.tokens = action.payload.tokens
        state.error = null
        state.isInitialized = true
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.tokens = null
        state.error = action.payload as string
        state.isInitialized = true
      })

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.tokens = action.payload.tokens
        state.error = null
        state.isInitialized = true
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.tokens = null
        state.error = action.payload as string
        state.isInitialized = true
      })

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.tokens = null
        state.error = null
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.tokens = null
        state.error = action.payload as string
      })

    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.error = null
        state.isInitialized = true
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.tokens = null
        state.error = action.payload as string
        state.isInitialized = true
      })

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.error = null
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  clearError,
  setTokens,
  clearTokens,
  updateUser,
  setInitialized,
} = authSlice.actions

export default authSlice.reducer
