'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { User, UserRole, ROLE_PERMISSIONS } from './types'
import { users as initialUsers } from './data/users'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  hasPermission: (permission: string) => boolean
  getRedirectPath: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'hospital-auth-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se ha usuario salvo no localStorage
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    const foundUser = initialUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active
    )

    if (!foundUser) {
      return { success: false, error: 'Email ou senha incorretos' }
    }

    setUser(foundUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(foundUser))
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    const permissions = ROLE_PERMISSIONS[user.role]
    return permissions.includes(permission)
  }, [user])

  const getRedirectPath = useCallback((): string => {
    if (!user) return '/login'
    
    const roleRedirects: Record<UserRole, string> = {
      recepcao: '/recepcao',
      triagem: '/triagem',
      clinico: '/clinico',
      laboratorio: '/laboratorio',
      cirurgiao: '/cirurgiao',
      admin: '/admin',
    }
    
    return roleRedirects[user.role] || '/login'
  }, [user])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, getRedirectPath }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
