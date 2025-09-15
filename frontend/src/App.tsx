import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import { RootState, AppDispatch } from './store'
import { checkAuth } from './store/slices/authSlice'
import { initializeSocket } from './store/slices/socketSlice'

// Layout Components
import AuthLayout from './components/layouts/AuthLayout'
import DashboardLayout from './components/layouts/DashboardLayout'
import LandingLayout from './components/layouts/LandingLayout'

// Page Components
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome'
import CommentsPage from './pages/dashboard/CommentsPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import ProfilePage from './pages/dashboard/ProfilePage'

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoadingScreen from './components/ui/LoadingScreen'

// Hooks
import { useSocket } from './hooks/useSocket'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth)
  
  // Initialize socket connection
  useSocket()

  useEffect(() => {
    // Check authentication status on app load
    dispatch(checkAuth())
  }, [dispatch])

  useEffect(() => {
    // Initialize socket if user is authenticated
    if (isAuthenticated && user) {
      dispatch(initializeSocket())
    }
  }, [dispatch, isAuthenticated, user])

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingLayout />}>
          <Route index element={<LandingPage />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="comments" element={<CommentsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch all route */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  )
}

export default App
