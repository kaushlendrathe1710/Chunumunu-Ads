import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@shared/types';
import { apiRequest, setAuthToken, getAuthToken } from '@/api/queryClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const AUTH_SERVER = import.meta.env.VITE_AUTH_SERVER;

// Try to get initial authentication state from localStorage
const getInitialAuthState = (): { user: User | null; isAuthenticated: boolean } => {
  try {
    const storedUser = localStorage.getItem('current_user');
    const hasToken = !!localStorage.getItem('auth_token');
    if (storedUser && hasToken) {
      return {
        user: JSON.parse(storedUser),
        isAuthenticated: true,
      };
    }
  } catch (e) {
    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
  }
  return { user: null, isAuthenticated: false };
};

const initialAuthState = getInitialAuthState();

const initialState: AuthState = {
  user: initialAuthState.user,
  isAuthenticated: initialAuthState.isAuthenticated,
  loading: false,
  error: null,
};

// Async thunk for fetching current user
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const response = await apiRequest('GET', `${AUTH_SERVER}/api/auth/me`);
    const data = await response.json();
    return data;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to fetch user');
  }
});

// Send OTP async thunk
export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (email: string, { rejectWithValue }) => {
    try {
      await apiRequest('POST', `${AUTH_SERVER}/api/auth/send-otp`, { email });
      return email;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to send OTP');
    }
  }
);

// Verify OTP async thunk
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, code }: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await apiRequest('POST', `${AUTH_SERVER}/api/auth/verify-otp`, {
        email,
        code,
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to verify OTP');
    }
  }
);

// Logout async thunk
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await apiRequest('POST', `${AUTH_SERVER}/api/auth/logout`, {});
  } catch (error: any) {
    // Continue with logout even if API call fails
    console.warn('Logout API call failed:', error);
  }
  return;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      // Update localStorage
      try {
        localStorage.setItem('current_user', JSON.stringify(action.payload));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      // Clear localStorage
      try {
        localStorage.removeItem('current_user');
        setAuthToken(null);
      } catch (error) {
        console.error('Failed to clear user from localStorage:', error);
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        try {
          localStorage.setItem('current_user', JSON.stringify(state.user));
        } catch (error) {
          console.error('Failed to update user in localStorage:', error);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMe cases
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.user) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          try {
            localStorage.setItem('current_user', JSON.stringify(action.payload.user));
          } catch (error) {
            console.error('Failed to save user to localStorage:', error);
          }
        }
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        // Only clear auth if there's no token
        const hasToken = !!localStorage.getItem('auth_token');
        if (!hasToken) {
          state.user = null;
          state.isAuthenticated = false;
          localStorage.removeItem('current_user');
        }
      })
      // sendOtp cases
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // verifyOtp cases
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.user) {
          state.user = action.payload.user;
          state.isAuthenticated = true;

          // Store user and token
          try {
            localStorage.setItem('current_user', JSON.stringify(action.payload.user));
            if (action.payload.token) {
              setAuthToken(action.payload.token);
            }
          } catch (error) {
            console.error('Failed to save auth data to localStorage:', error);
          }
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // logout cases
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        // Clear localStorage
        try {
          localStorage.removeItem('current_user');
          setAuthToken(null);
        } catch (error) {
          console.error('Failed to clear auth data from localStorage:', error);
        }
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        // Even if logout fails, clear local state
        state.user = null;
        state.isAuthenticated = false;
        try {
          localStorage.removeItem('current_user');
          setAuthToken(null);
        } catch (error) {
          console.error('Failed to clear auth data from localStorage:', error);
        }
      });
  },
});

export const { setUser, clearUser, setError, clearError, setLoading, updateUser } =
  authSlice.actions;
export default authSlice.reducer;
