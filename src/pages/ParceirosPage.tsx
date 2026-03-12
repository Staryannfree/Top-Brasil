import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoTopBrasil from '@/logo/topbrasil.png';
import { CheckCircle2, MapPin, Search, Star, MessageCircle, Gift, ArrowRight } from 'lucide-react';

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

const ParceirosPage = () => {
  const [nomeResp, setNomeResp] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatTelefone(e.target.value));
  };

  const enviarLeadParceiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeResp.trim() || !empresa.trim() || !telefone.trim() || telefone.length < 14 || !tipoNegocio) {
      toast.error('Por favor, preencha todos os campos corretamente.');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Buscar um tenant_id padrão (já que é uma página pública)
      const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).single();
      const tenant_id = tenantData?.id;

      // 2. Nome composto para o card do Lead
      const nomeFinal = `[${tipoNegocio}] ${empresa} - ${nomeResp}`;
      const telefoneLimpo = telefone.replace(/\D/g, '');

      // Tenta inserir com a origem nova, se falhar por causa do ENUM (400), usa 'indicacao' como fallback
      let { data, error } = await supabase.from('leads').insert([{
        nome: nomeFinal,
        telefone: telefoneLimpo,
        categoria: tipoNegocio,
        origem: 'landing_page_parceiros' as any,
        status: 'novo_parceiro',
        tenant_id: tenant_id,
        dados_verificados: false,
        tem_lembrete: false,
        consultoria_vip: false
      }]);

      if (error && error.message.includes('lead_origem')) {
        console.warn("Enum landing_page_parceiros não existe. Usando 'indicacao' como fallback.");
        const fallback = await supabase.from('leads').insert([{
          nome: nomeFinal,
          telefone: telefoneLimpo,
          categoria: tipoNegocio,
          origem: 'indicacao',
          status: 'novo_parceiro',
          tenant_id: tenant_id,
          dados_verificados: false,
          tem_lembrete: false,
          consultoria_vip: false
        }]);
        error = fallback.error;
      }

      if (error) {
        throw new Error(error.message);
      }

      setSuccess(true);
      toast.success('Solicitação enviada! Nossa equipe entrará em contato em até 24h.');
      setNomeResp('');
      setEmpresa('');
      setTelefone('');
      setTipoNegocio('');
    } catch (error: any) {
      toast.error('Ocorreu um erro ao enviar sua solicitação. Tente novamente mais tarde.');
      console.error(error);
    } finally {
      if (!success) {
         setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 font-sans text-[#374151] antialiased">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logoTopBrasil} alt="Logo Top Brasil" className="h-8 w-auto" />
            <span className="text-xl font-black text-[#111827] tracking-tighter">
              TOP<span className="text-[#EB6607]">BRASIL</span> <span className="font-light text-gray-500 text-lg">Parceiros</span>
            </span>
          </div>
          <a href="/" className="text-sm font-semibold text-gray-500 hover:text-[#111827] transition">
            Voltar para o Início
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#111827] text-white pt-24 pb-32 px-4 relative overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-black/50 blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#EB6607]/20 text-[#EB6607] font-bold px-4 py-1.5 rounded-full text-sm mb-8 border border-[#EB6607]/30">
            <Star className="h-4 w-4" /> B2B Partner Program
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            Transforme o fluxo de carros da sua loja em <span className="text-[#EB6607]">lucro e novos clientes.</span>
          </h1>
          <p className="text-xl text-gray-300 md:px-20 mb-10">
            Seja um parceiro credenciado da Top Brasil Promoções e fature indicando proteção veicular enquanto atrai nossa base de clientes para o seu negócio.
          </p>
          <a href="#form-parceiro" className="inline-flex items-center justify-center gap-2 bg-[#EB6607] hover:bg-[#d95a06] text-white font-bold text-lg px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-xl shadow-[#EB6607]/20">
            Quero ser um Credenciado <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Como Funciona - 3 Passos */}
      <section className="py-24 bg-white px-4 border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-[#111827] mb-4">Como a parceria funciona?</h2>
            <p className="text-lg text-gray-500">Muito além de comissões, um modelo ganha-ganha real para o seu negócio.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#111827] text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg">1</div>
              <h3 className="text-xl font-bold mb-3">Receba seu Link e Material</h3>
              <p className="text-gray-600">Você recebe material de PDV (displays, adesivos) e um link exclusivo para indicar a Top Brasil.</p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-0 w-full h-[2px] bg-gray-200 -z-10 -ml-1/2"></div>
              <div className="w-16 h-16 bg-[#EB6607] text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-[#EB6607]/30">2</div>
              <h3 className="text-xl font-bold mb-3">Seu cliente faz a cotação</h3>
              <p className="text-gray-600">O cliente lê o QR Code na sua loja ou clica no link e recebe a cotação na hora em nosso sistema inteligente.</p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-0 w-full h-[2px] bg-gray-200 -z-10 -ml-1/2"></div>
              <div className="w-16 h-16 bg-[#111827] text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg">3</div>
              <h3 className="text-xl font-bold mb-3">Você lucra e ganha clientes</h3>
              <p className="text-gray-600">Você recebe comissões atrativas e a Top Brasil passa a indicar seu estabelecimento para nossa base regional.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vantagens por Segmento */}
      <section className="py-24 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-[#111827] mb-4">Vantagens Exclusivas para cada Segmento</h2>
            <div className="w-20 h-1 bg-[#EB6607] mx-auto mt-4"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-[#111827] mb-6">
                <i className="fas fa-wrench text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#111827]">Oficinas Mecânicas</h3>
              <p className="text-gray-600 mb-4">Tornando-se uma oficina parceira referenciada, nós direcionamos veículos da nossa base envolvidos em sinistros diretamente para a sua oficina, garantindo fluxo constante de serviços.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-[#EB6607]/10 rounded-xl flex items-center justify-center text-[#EB6607] mb-6">
                <i className="fas fa-car-wash text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#111827]">Lava-Rápidos e Estética</h3>
              <p className="text-gray-600 mb-4">Seja parte do nosso Clube de Descontos. Nossos clientes recebem vantagens na sua loja, e você rentabiliza indicando proteção para os carros parados no seu pátio.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-[#EB6607]/10 rounded-xl flex items-center justify-center text-[#EB6607] mb-6">
                <i className="fas fa-file-signature text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#111827]">Despachantes</h3>
              <p className="text-gray-600 mb-4">Agregue valor imediato no documento. Ofereça proteção junto à regularização do veículo e lucre duas vezes no mesmo cliente, sem esforço adicional.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-[#111827] mb-6">
                <i className="fas fa-tags text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#111827]">Lojas de Seminovos</h3>
              <p className="text-gray-600 mb-4">O carro já sai protegido da sua loja. Garantia de procedência para o seu cliente e uma fonte extra de receita poderosa para complementar as suas vendas de veículos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gold Bonus */}
      <section className="py-16 bg-[#111827] text-white my-10 max-w-6xl mx-auto rounded-3xl mx-4 lg:mx-auto relative overflow-hidden px-8 lg:px-16 flex items-center">
        <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-[#EB6607]/20 to-transparent pointer-events-none"></div>
        <div className="relative z-10 lg:w-2/3">
          <div className="flex items-center gap-2 text-[#EB6607] font-bold mb-4">
             <Gift className="h-5 w-5" /> EXCLUSIVIDADE TOP BRASIL
          </div>
          <h2 className="text-3xl font-black mb-4">Bônus Agência Colossal</h2>
          <p className="text-lg text-gray-300 mb-0">
            Parceiros de categoria <strong>Gold</strong> (alto volume de indicações mensais) ganham 
            uma consultoria de Marketing Digital gratuita com a nossa equipe da Agência Colossal para otimizar 
            o perfil do seu negócio no <strong className="text-white">Google Meu Negócio</strong> e atrair clientes da internet.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section id="form-parceiro" className="py-24 bg-white px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#111827] mb-4">Seja um Parceiro Oficial</h2>
            <p className="text-gray-500">Preencha os dados abaixo e nosso time comercial fará contato para aprovar seu credenciamento.</p>
          </div>
          
          <form onSubmit={enviarLeadParceiro} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Responsável *</label>
              <input 
                type="text" 
                value={nomeResp}
                onChange={(e) => setNomeResp(e.target.value)}
                placeholder="Ex: João da Silva" 
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-2 focus:ring-[#EB6607]/20 outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Empresa *</label>
              <input 
                type="text" 
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: Auto Mecânica São Jorge" 
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-2 focus:ring-[#EB6607]/20 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp da Empresa (ou seu) *</label>
              <input 
                type="tel" 
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="(00) 00000-0000" 
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-2 focus:ring-[#EB6607]/20 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Negócio *</label>
              <select 
                value={tipoNegocio}
                onChange={(e) => setTipoNegocio(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#EB6607] focus:ring-2 focus:ring-[#EB6607]/20 outline-none transition-all appearance-none cursor-pointer"
                required
              >
                <option value="" disabled>Selecione a categoria...</option>
                <option value="Oficina Mecânica">Oficina Mecânica</option>
                <option value="Lava-Rápido / Estética">Lava-Rápido / Estética</option>
                <option value="Loja de Veículos">Loja de Veículos / Seminovos</option>
                <option value="Despachante">Despachante</option>
                <option value="Outro">Outro segmento automotivo</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={loading || success}
              className={`w-full font-bold py-4 rounded-xl shadow-lg transform transition flex items-center justify-center gap-2 
                ${success ? 'bg-green-500 text-white cursor-not-allowed' : 'bg-[#111827] hover:bg-gray-800 text-white hover:scale-[1.02]'}`}
            >
              {success ? (
                <><CheckCircle2 className="h-5 w-5" /> SOLICITAÇÃO ENVIADA</>
              ) : loading ? (
                <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> PROCESSANDO...</>
              ) : (
                'Solicitar Análise de Parceria'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111827] text-gray-400 py-12 text-center border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <img src={logoTopBrasil} alt="Top Brasil Logo" className="h-10 mx-auto brightness-0 invert opacity-50 mb-6" />
          <p>© 2026 Proteção Top Brasil. Programa de Credenciamento Oficial B2B.</p>
        </div>
      </footer>
    </div>
  );
};

export default ParceirosPage;
