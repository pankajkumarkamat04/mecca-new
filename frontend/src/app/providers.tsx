'use client'

import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          {children}
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#10B981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#EF4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
