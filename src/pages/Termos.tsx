import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const Termos = () => {
  useEffect(() => { window.scrollTo({ top:0, behavior:'smooth' }); }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20 container mx-auto px-4 prose prose-invert max-w-3xl">
        <h1>Termos de Uso</h1>
        <p>Estes Termos de Uso regulam a utilização dos serviços e produtos oferecidos pela Codifica. Ao acessar nossa plataforma ou contratar nossos serviços, você concorda integralmente com estes termos.</p>
        <h2>1. Serviços</h2>
        <p>Prestamos serviços de desenvolvimento de software sob demanda, consultoria técnica e soluções digitais. O escopo específico de cada projeto será definido em proposta comercial.</p>
        <h2>2. Obrigações do Cliente</h2>
        <ul>
          <li>Fornecer informações corretas e completas.</li>
          <li>Responder em tempo hábil às solicitações necessárias para andamento do projeto.</li>
          <li>Respeitar prazos de aprovação e pagamentos acordados.</li>
        </ul>
        <h2>3. Propriedade Intelectual</h2>
        <p>O código-fonte e entregáveis pertencem ao cliente após a quitação integral, exceto bibliotecas de terceiros e componentes licenciados.</p>
        <h2>4. Pagamentos</h2>
        <p>Os valores, forma e cronograma de pagamento serão definidos em proposta. Atrasos podem suspender entregas.</p>
        <h2>5. Garantia e Suporte</h2>
        <p>Correções de bugs identificados dentro do período de garantia acordado serão realizadas sem custo adicional, desde que não decorram de uso indevido ou alterações externas.</p>
        <h2>6. Limitação de Responsabilidade</h2>
        <p>Não respondemos por danos indiretos, perda de lucros ou indisponibilidades causadas por infraestrutura de terceiros.</p>
        <h2>7. Cancelamento</h2>
        <p>Cada parte pode rescindir em caso de descumprimento material não sanado em até 10 dias após notificação formal.</p>
        <h2>8. Atualizações</h2>
        <p>Podemos atualizar estes termos a qualquer momento. A versão vigente estará sempre disponível nesta página.</p>
        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Termos;
