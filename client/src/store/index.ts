import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authSlice from './slices/authSlice';
import teamSlice from './slices/teamSlice.ts';
import themeSlice from './slices/themeSlice';
import { logout, clearUser } from './slices/authSlice';

const appReducer = combineReducers({
  auth: authSlice,
  team: teamSlice,
  theme: themeSlice,
});

const rootReducer: typeof appReducer = (state: any, action: any) => {
  if (
    action.type === logout.fulfilled.type ||
    action.type === logout.rejected.type ||
    action.type === clearUser.type
  ) {
    // Preserve theme slice, reset others
    const themeState = state?.theme;
    state = { theme: themeState };
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
