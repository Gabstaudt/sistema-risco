'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Eye,
  EyeOff,
  Loader2,
  ArrowRight
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { user, isLoading: isAuthLoading, login, getRedirectPath } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace(getRedirectPath())
    }
  }, [user, isAuthLoading, getRedirectPath, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      router.replace(result.redirectPath || '/login')
    } else {
      setError(result.error || 'Erro ao fazer login')
      setIsLoading(false)
    }
  }

  const demoCredentials = [
    { role: 'Recepcao', email: 'recepcao@hospital.com' },
    { role: 'Triagem', email: 'triagem@hospital.com' },
    { role: 'Clinico', email: 'clinico@hospital.com' },
    { role: 'Laboratorio', email: 'laboratorio@hospital.com' },
    { role: 'Cardiologista', email: 'cardiologista@hospital.com' },
    { role: 'Anestesista', email: 'anestesista@hospital.com' },
    { role: 'Cirurgiao', email: 'cirurgiao@hospital.com' },
    { role: 'Admin', email: 'admin@hospital.com' },
  ]

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('123456')
    setError('')
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <img src="/Logo%20Medrisk/brand/logo/medrisk-simbolo-mono-branco.svg" alt="" aria-hidden="true" className="absolute -bottom-40 -right-40 w-[720px] max-w-none opacity-[0.06]" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <BrandLogo variant="negative" className="w-[320px] -ml-4 mb-12" />
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6 text-balance">Segurança em cada passagem.</h1>
          <p className="max-w-md text-lg leading-relaxed text-white/80">Cada etapa da jornada, registrada e segura. Precisão e cuidado na avaliação de risco cirúrgico.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-card">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo className="w-[260px]" />
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-center">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Credenciais de demonstracao
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {demoCredentials.map((cred) => (
                    <button
                      key={cred.email}
                      onClick={() => fillDemo(cred.email)}
                      className="rounded-md bg-secondary px-3 py-2 text-left text-xs text-secondary-foreground transition-colors hover:bg-secondary/80"
                      disabled={isLoading}
                    >
                      <span className="block font-medium">{cred.role}</span>
                      <span className="block text-[11px] text-muted-foreground">{cred.email}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Senha padrao: <code className="bg-muted px-1.5 py-0.5 rounded">123456</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Todas as ações são registradas para auditoria.
          </p>
        </div>
      </div>
    </div>
  )
}
