import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'

// Import slices
import authSlice from './slices/authSlice'
import socketSlice from './slices/socketSlice'
import commentsSlice from './slices/commentsSlice'
import subscriptionSlice from './slices/subscriptionSlice'
import settingsSlice from './slices/settingsSlice'
import analyticsSlice from './slices/analyticsSlice'
import uiSlice from './slices/uiSlice'

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'settings'], // Only persist auth and settings
  blacklist: ['socket', 'ui'], // Don't persist socket and UI state
}

// Auth persist config
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'tokens', 'isAuthenticated'], // Only persist essential auth data
}

// Root reducer
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  socket: socketSlice,
  comments: commentsSlice,
  subscription: subscriptionSlice,
  settings: settingsSlice,
  analytics: analyticsSlice,
  ui: uiSlice,
})

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer)

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['socket.instance'],
      },
      immutableCheck: {
        ignoredPaths: ['socket.instance'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

// Persistor
export const persistor = persistStore(store)

// Types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Selector hooks
export { useAppDispatch, useAppSelector } from './hooks'
