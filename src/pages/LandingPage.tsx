import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoTopBrasil from '@/logo/topbrasil.png';

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
    formatted = '(' + formatted.substring(0, 2) + ')' + formatted.substring(2);
  }
  return formatted;
};

const LandingPage = () => {
  useEffect(() => {
    document.title = "Top Brasil";
  }, []);

  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaca(formatPlaca(e.target.value));
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatTelefone(e.target.value));
  };

  const enviarLead = async () => {
    if (!nome.trim() || !placa.trim() || !telefone.trim() || telefone.length < 13) {
      toast.error('Por favor, preencha todos os campos corretamente.');
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke('processar-lead-landing', {
        body: { nome, placa, telefone }
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

      // WhatsApp Redirection Logic
      const numeroWhatsAppTopBrasil = "5562996299484";
      const mensagemPronta = "Olá! Fiz a simulação no site e quero ver a minha proposta.";
      const linkWhatsapp = `https://wa.me/${numeroWhatsAppTopBrasil}?text=${encodeURIComponent(mensagemPronta)}`;

      // Delay slightly for the success state UI to show (optional but recommended)
      setTimeout(() => {
        window.location.href = linkWhatsapp;
      }, 1500);

      setNome('');
      setPlaca('');
      setTelefone('');
    } catch (error: any) {
      toast.error('Ocorreu um erro ao processar sua cotação. Tente novamente mais tarde.');
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 font-sans text-[#374151] antialiased relative">
      {/* Botão WhatsApp Fixo */}
      <a
        href="https://wa.me/5562996299484"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform flex items-center justify-center text-3xl"
      >
        <i className="fab fa-whatsapp"></i>
      </a>

      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logoTopBrasil} alt="Logo Top Brasil" className="h-10 w-auto" />
            <span className="text-2xl font-black text-[#111827] tracking-tighter hidden sm:block">
              TOP<span className="text-[#EB6607]">BRASIL</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/parceiros" className="text-sm font-bold text-[#111827] hover:text-[#EB6607] transition hidden sm:block">
              Área de Parceiros
            </a>
            <a href="#cotacao" className="bg-[#111827] text-white px-5 py-2 rounded-lg font-bold hover:bg-gray-800 transition text-sm">
              Fazer Cotação
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="cotacao" className="relative bg-[#111827] text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="relative max-w-5xl mx-auto px-4 py-20 lg:py-28 text-center z-10">
          <div className="inline-block bg-[#EB6607] text-white font-bold px-4 py-1 rounded-full text-sm mb-6 uppercase tracking-wider">
            <i className="fas fa-star text-yellow-300 mr-1"></i> A Melhor Proteção do Brasil
          </div>
          <h1 className="text-4xl lg:text-6xl font-black mb-6 leading-tight">
            Seu carro protegido hoje, <br /><span className="text-gray-300">sem burocracia e sem SPC.</span>
          </h1>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Roubo, furto, perda total e guincho 24h. Descubra agora o valor exato para blindar o seu patrimônio 100% pela Tabela FIPE.
          </p>

          <div className="bg-white p-3 rounded-xl shadow-2xl max-w-4xl mx-auto flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fas fa-user text-gray-400"></i>
              </div>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu Primeiro Nome"
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827] focus:outline-none text-gray-900 font-bold text-lg"
              />
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fas fa-car text-gray-400"></i>
              </div>
              <input
                type="text"
                value={placa}
                onChange={handlePlacaChange}
                placeholder="Sua Placa (ABC-1234)"
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827] focus:outline-none text-gray-900 font-bold uppercase text-lg"
                maxLength={8}
              />
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fab fa-whatsapp text-gray-400"></i>
              </div>
              <input
                type="tel"
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="(99)999999999"
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827] focus:outline-none text-gray-900 font-bold text-lg"
                maxLength={14}
              />
            </div>
            <button
              onClick={enviarLead}
              disabled={loading || success}
              className={`font-black py-4 px-8 rounded-lg shadow-lg transform transition flex items-center justify-center gap-2 ${success ? 'bg-green-500 text-white cursor-not-allowed hover:scale-100' : 'bg-[#EB6607] hover:bg-red-700 text-white hover:scale-105'}`}
            >
              {success ? (
                <><i className="fas fa-check"></i> PRONTO!</>
              ) : loading ? (
                <><i className="fas fa-spinner fa-spin"></i> CALCULANDO...</>
              ) : (
                <>VER VALOR <i className="fas fa-arrow-right"></i></>
              )}
            </button>
          </div>
          {success && (
            <p className="text-green-400 font-bold mt-4 text-lg animate-fade-in">
              🎉 Pronto! Verifique o seu WhatsApp agora mesmo com a sua proposta.
            </p>
          )}
          <p className="text-sm text-gray-400 mt-4"><i className="fas fa-shield-alt text-[#25D366]"></i> Mais de 5.000 veículos protegidos.</p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#111827]">Cobertura Completa para sua paz de espírito</h2>
            <div className="w-20 h-1 bg-[#EB6607] mx-auto mt-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <BenefitCard icon="fas fa-mask" title="Roubo e Furto" description="Indenização de 100% da Tabela FIPE caso o seu veículo não seja recuperado." />
            <BenefitCard icon="fas fa-car-crash" title="Colisão (PT)" description="Cobertura total para consertos ou indenização integral em caso de perda total." />
            <BenefitCard icon="fas fa-truck-pickup" title="Guincho 24h" description="Pane seca, elétrica, mecânica ou pneu furado? Enviamos socorro onde você estiver." />
            <BenefitCard icon="fas fa-cloud-showers-heavy" title="Fenômenos da Natureza" description="Proteção contra enchentes, alagamentos, chuva de granizo e queda de árvores." />
            <BenefitCard icon="fas fa-car-side" title="Terceiros" description="Bateu no carro de outra pessoa? Nós cobrimos os danos materiais do terceiro." />
            <BenefitCard icon="fas fa-window-maximize" title="Vidros e Faróis" description="Reparo ou troca de para-brisas, vidros laterais, faróis e lanternas." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[#111827] text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black">Como proteger seu carro hoje</h2>
            <p className="text-gray-400 mt-4">Processo 100% digital. Sem sair de casa.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <Step number="1" title="Faça a Cotação" description="Digite sua placa no topo do site. Nosso sistema busca a Tabela FIPE automaticamente." />
            <Step number="2" title="Receba no WhatsApp" description="Nossa inteligência envia a proposta exata e as coberturas direto no seu celular em instantes." />
            <Step number="3" title="Vistoria Digital" description="Aprovou o valor? Você mesmo tira as fotos do carro pelo celular. Ativação imediata!" />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#111827]">Dúvidas Frequentes</h2>
          </div>
          <div className="space-y-4">
            <FaqItem
              question="A Top Brasil consulta SPC ou Serasa?"
              answer="Não! A proteção veicular é focada no veículo e não no histórico financeiro do motorista. Não fazemos nenhum tipo de consulta ao SPC ou Serasa para aprovar a sua proteção."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-gray-100 mt-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 text-gray-400 grayscale opacity-70">
            <img src={logoTopBrasil} alt="Logo Top Brasil" className="h-8 w-auto" />
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 Top Brasil Proteção Veicular. Todos os direitos reservados. <br />
            Cotação 100% Segura e Digital.
          </p>
        </div>
      </footer>
    </div>
  );
};

const BenefitCard = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="flex gap-4 p-6 border border-gray-100 rounded-2xl hover:shadow-xl transition bg-gray-50">
    <div className="text-3xl text-[#EB6607]"><i className={icon}></i></div>
    <div>
      <h3 className="font-bold text-xl mb-2 text-[#111827]">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  </div>
);

const Step = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="relative">
    <div className="w-20 h-20 mx-auto bg-[#dc2626] rounded-full flex items-center justify-center text-3xl font-black mb-6 shadow-lg shadow-red-500/30">{number}</div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

const FaqItem = ({ question, answer }: { question: string; answer: string }) => (
  <details className="group bg-white rounded-lg shadow-sm border border-gray-100 p-6">
    <summary className="flex justify-between items-center font-bold text-lg text-[#111827] cursor-pointer">
      {question}
      <span className="transition group-open:rotate-180"><i className="fas fa-chevron-down"></i></span>
    </summary>
    <p className="text-gray-600 mt-4 text-sm leading-relaxed">{answer}</p>
  </details>
);

export default LandingPage;
