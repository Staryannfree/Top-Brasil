import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoTopBrasil from '@/logo/topbrasil.png';
import { Shield, CheckCircle2, Star, ArrowRight, Loader2 } from 'lucide-react';

const formatPlaca = (val: string) => {
  let formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (formatted.length > 7) {
    formatted = formatted.substring(0, 7);
  }
  if (formatted.length > 3) {
    formatted = formatted.substring(0, 3) + '-' + formatted.substring(3);
  }
  return formatted;
};

const formatTelefone = (val: string) => {
  let formatted = val.replace(/\D/g, '');
  if (formatted.length > 11) {
    formatted = formatted.substring(0, 11);
  }
  if (formatted.length > 2) {
    formatted = '(' + formatted.substring(0, 2) + ') ' + formatted.substring(2);
  }
  if (formatted.length > 10) {
    formatted = formatted.substring(0, 10) + '-' + formatted.substring(10);
  }
  return formatted;
};

const ParceiroDynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [isSearchingPartner, setIsSearchingPartner] = useState(true);
  
  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. Carregar dados do parceiro e gerenciar Meta Tags
  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const { data, error } = await supabase
          .from('parceiros_ativos')
          .select('*')
          .eq('slug', slug)
          .eq('ativo', true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("Parceiro não encontrado ou oferta expirada.");
          navigate('/', { replace: true });
          return;
        }

        setPartner(data);
        
        // Atualizar Meta Tags dinamicamente
        document.title = `Top Brasil + ${data.nome_empresa} - Condição Especial`;
        
        // Update OG Tags
        const setMeta = (property: string, content: string) => {
          let element = document.querySelector(`meta[property="${property}"]`);
          if (!element) {
            element = document.createElement('meta');
            element.setAttribute('property', property);
            document.head.appendChild(element);
          }
          element.setAttribute('content', content);
        };

        setMeta('og:title', `Top Brasil + ${data.nome_empresa} - Condição Especial`);
        setMeta('og:description', `Oferta exclusiva para clientes ${data.nome_empresa}: ${data.mensagem_beneficio}`);
        
      } catch (err) {
        console.error("Erro ao carregar parceiro:", err);
        navigate('/', { replace: true });
      } finally {
        setIsSearchingPartner(false);
      }
    };

    if (slug) fetchPartner();
  }, [slug, navigate]);

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaca(formatPlaca(e.target.value));
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatTelefone(e.target.value));
  };

  const enviarLead = async () => {
    if (!nome.trim() || !placa.trim() || !telefone.trim() || telefone.length < 14) {
      toast.error('Por favor, preencha todos os campos corretamente.');
      return;
    }

    setLoading(true);
    
    try {
      // payload com a origem do parceiro
      const response = await supabase.functions.invoke('processar-lead-landing', {
        body: { 
          nome, 
          placa, 
          telefone,
          origem: `parceiro:${slug}`,
          tenant_id: partner?.tenant_id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data && response.data.success === false) {
          toast.error(response.data.error || 'Não conseguimos localizar essa placa. Verifique e tente novamente.');
          setLoading(false);
          return;
      }

      setSuccess(true);
      setNome('');
      setPlaca('');
      setTelefone('');
      toast.success('Simulação concluída! Verifique seu WhatsApp.');
    } catch (error: any) {
      toast.error('Ocorreu um erro ao processar sua cotação. Tente novamente mais tarde.');
    } finally {
      if (!success) {
         setLoading(false);
      }
    }
  };

  if (isSearchingPartner) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#111827]">
        <Loader2 className="h-12 w-12 text-[#EB6607] animate-spin mb-4" />
        <p className="text-white font-medium">Carregando oferta especial...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 font-sans text-[#374151] antialiased relative">
      {/* Botão WhatsApp Fixo */}
      <a 
        href={`https://wa.me/55SEUNUMERO?text=Vim pela página da ${partner?.nome_empresa}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform flex items-center justify-center text-3xl"
      >
        <i className="fab fa-whatsapp"></i>
      </a>

      {/* Header Co-Branded */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b-4 border-[#EB6607]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logoTopBrasil} alt="Logo Top Brasil" className="h-10 w-auto" />
            <div className="h-8 w-[2px] bg-gray-200 hidden sm:block"></div>
            <span className="text-sm sm:text-lg font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
               <span className="text-[#111827]">+</span> {partner?.nome_empresa}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
               <span className="text-[10px] text-gray-400 uppercase font-black leading-none">Página Oficial de</span>
               <span className="text-sm font-bold text-[#EB6607]">Parceria Credenciada</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-[#111827] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent"></div>
        <div className="relative max-w-5xl mx-auto px-4 py-20 lg:py-28 text-center z-10">
          <div className="inline-block bg-[#EB6607] text-white font-bold px-6 py-2 rounded-full text-sm mb-6 uppercase tracking-widest shadow-lg shadow-[#EB6607]/20">
             🎁 BÔNUS EXCLUSIVO: {partner?.mensagem_beneficio}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black mb-6 leading-tight">
            Você é um cliente especial da <br/>
            <span className="text-[#EB6607] drop-shadow-sm">{partner?.nome_empresa}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Por isso, preparamos uma condição única para proteger seu veículo 100% pela Tabela FIPE hoje. 
            Sem burocracia e com a <span className="text-white font-bold">ativação imediata.</span>
          </p>

          <div className="bg-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-4xl mx-auto flex flex-col md:flex-row gap-3 border border-gray-100">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu Nome" 
                className="w-full pl-6 pr-4 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-4 focus:ring-[#EB6607]/10 focus:outline-none text-gray-900 font-bold text-lg transition-all" 
              />
            </div>
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={placa}
                onChange={handlePlacaChange}
                placeholder="Placa do Carro" 
                className="w-full pl-6 pr-4 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-4 focus:ring-[#EB6607]/10 focus:outline-none text-gray-900 font-bold uppercase text-lg transition-all" 
                maxLength={8} 
              />
            </div>
            <div className="flex-1 relative">
              <input 
                type="tel" 
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="WhatsApp" 
                className="w-full pl-6 pr-4 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-4 focus:ring-[#EB6607]/10 focus:outline-none text-gray-900 font-bold text-lg transition-all"
                maxLength={15}
              />
            </div>
            <button 
              onClick={enviarLead}
              disabled={loading || success}
              className={`font-black py-4 px-10 rounded-xl shadow-xl transform transition flex items-center justify-center gap-2 text-lg ${success ? 'bg-green-500 text-white cursor-not-allowed hover:scale-100' : 'bg-[#EB6607] hover:bg-[#d95a06] text-white hover:scale-[1.03]'}`}
            >
               {success ? (
                  <><CheckCircle2 className="h-6 w-6" /> ENVIADO!</>
               ) : loading ? (
                 <><Loader2 className="h-6 w-6 animate-spin" /> ...</>
               ) : (
                 <>VER VALOR <ArrowRight className="h-5 w-5" /></>
               )}
            </button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
             <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-[#25D366]" /> Proteção 100% FIPE</span>
             <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-[#25D366]" /> Sem Consulta SPC/Serasa</span>
          </div>
        </div>
      </section>

      {/* Benefits simple */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8">
               <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-[#EB6607] mb-6">
                  <Shield className="h-7 w-7" />
               </div>
               <h3 className="text-xl font-black mb-3">Segurança Total</h3>
               <p className="text-gray-500">Roubo, furto, incêndio e colisão. Cobertura completa sem burocracia.</p>
            </div>
            <div className="p-8">
               <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-[#EB6607] mb-6">
                  <Star className="h-7 w-7" />
               </div>
               <h3 className="text-xl font-black mb-3">Guincho 24h</h3>
               <p className="text-gray-500">Socorro em todo o Brasil para pane seca, elétrica ou mecânica.</p>
            </div>
            <div className="p-8">
               <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-[#EB6607] mb-6">
                  <CheckCircle2 className="h-7 w-7" />
               </div>
               <h3 className="text-xl font-black mb-3">Ativação Rápida</h3>
               <p className="text-gray-500">Vistoria digital pelo próprio celular. Seu carro protegido em minutos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111827] py-12 text-center text-gray-500">
        <div className="max-w-6xl mx-auto px-4">
           <img src={logoTopBrasil} alt="Top Brasil Logo" className="h-8 mx-auto grayscale brightness-0 invert opacity-30 mb-6" />
           <p className="text-sm">© 2024 Top Brasil Proteção Veicular + {partner?.nome_empresa}. <br/>Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default ParceiroDynamicPage;
