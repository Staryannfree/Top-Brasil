import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'vendedor' | 'gerente' | 'superadmin';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast.error(`Erro ao logar: ${error.message}`);
      return;
    }

    toast.success('Bem-vindo de volta!');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — brand visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(220,40%,18%)] to-[hsl(215,30%,8%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,hsl(222,47%,20%)_0%,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Proteção Top Brasil</span>
          </div>
          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight">
              Gerencie seus leads com <span className="text-primary-foreground/80">precisão cirúrgica</span>
            </h2>
            <p className="text-lg text-white/60">CRM inteligente para consultores de proteção veicular. Controle vendas, comissões e metas em um só lugar.</p>
          </div>
          <p className="text-xs text-white/30">© 2026 Proteção Top Brasil • Todos os direitos reservados</p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Proteção Top Brasil</span>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground">Entrar no CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">Insira suas credenciais para acessar o painel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info('Funcionalidade em breve')}>
                Esqueci minha senha
              </button>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
