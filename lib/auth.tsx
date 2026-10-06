'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { User, UserRole } from './types'
import { hasUserPermission } from './permissions'
import { users as initialUsers } from './data/users'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectPath?: string }>
  logout: () => void
  setSession: (user: User | null) => void
  hasPermission: (permission: string) => boolean
  getRedirectPath: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'hospital-auth-user'

function getRedirectPathForRole(role: UserRole): string {
  const roleRedirects: Record<UserRole, string> = {
    recepcao: '/recepcao',
    triagem: '/triagem',
    clinico: '/clinico',
    laboratorio: '/laboratorio',
    cardiologista: '/cardiologista',
    anestesista: '/anestesista',
    cirurgiao: '/cirurgiao',
    admin: '/admin',
  }

  return roleRedirects[role] || '/login'
}

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

  // Backend integration can install its authenticated user and effective permissions here.
  const setSession = useCallback((sessionUser: User | null) => {
    setUser(sessionUser)
    if (sessionUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; redirectPath?: string }> => {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    const normalizedEmail = email.trim().toLowerCase()

    const foundUser = initialUsers.find(
      u => u.email.toLowerCase() === normalizedEmail && u.password === password && u.active
    )

    if (!foundUser) {
      return { success: false, error: 'Email ou senha incorretos' }
    }

    setSession(foundUser)
    return { success: true, redirectPath: getRedirectPathForRole(foundUser.role) }
  }, [setSession])

  const logout = useCallback(() => {
    setSession(null)
  }, [setSession])

  const hasPermission = useCallback((permission: string): boolean => {
    return hasUserPermission(user, permission)
  }, [user])

  const getRedirectPath = useCallback((): string => {
    if (!user) return '/login'

    return getRedirectPathForRole(user.role)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setSession, hasPermission, getRedirectPath }}>
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
