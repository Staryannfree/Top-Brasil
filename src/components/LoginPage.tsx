import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logoTopBrasil from '@/logo/topbrasil.png';
import { Badge } from './ui/badge';

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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#EB6607]">
        {/* Abstract shapes for depth */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-black/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          <div className="flex items-center gap-3">
            <img src={logoTopBrasil} alt="Logo Top Brasil" className="h-12 w-auto brightness-0 invert" />
            <span className="text-2xl font-black tracking-tighter">
              TOP<span className="opacity-80">BRASIL</span>
            </span>
          </div>
          
          <div className="space-y-6 max-w-md">
            <Badge variant="outline" className="text-white border-white/40 bg-white/10 backdrop-blur w-fit">
              ✨ CRM Inteligente v2.0
            </Badge>
            <h2 className="text-5xl font-extrabold leading-tight tracking-tight">
              Gerencie seus leads com <br />
              <span className="text-black/20">precisão cirúrgica</span>
            </h2>
            <p className="text-xl text-white/80 font-medium">
              A plataforma definitiva para consultores de proteção veicular. Controle vendas e metas em um só lugar.
            </p>
          </div>
          
          <div className="flex items-center justify-between border-t border-white/20 pt-8 mt-auto">
            <p className="text-sm text-white/50">© 2026 Proteção Top Brasil</p>
            <div className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white/40" />
              <div className="h-2 w-2 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <img src={logoTopBrasil} alt="Logo Top Brasil" className="h-10 w-auto" />
            <span className="text-2xl font-black text-foreground tracking-tighter">
              TOP<span className="text-[#EB6607]">BRASIL</span>
            </span>
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
