import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const Privacidade = () => {
  useEffect(() => { window.scrollTo({ top:0, behavior:'smooth' }); }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20 container mx-auto px-4 prose prose-invert max-w-3xl">
        <h1>Política de Privacidade</h1>
        <p>Esta política descreve como a Codifica coleta, utiliza e protege dados pessoais fornecidos por visitantes e clientes.</p>
        <h2>1. Dados Coletados</h2>
        <ul>
          <li>Informações de contato (nome, e-mail, telefone) fornecidas em formulários.</li>
          <li>Detalhes do projeto ou mensagem enviada.</li>
          <li>Dados técnicos básicos (IP, navegador) para métricas e segurança.</li>
        </ul>
        <h2>2. Uso das Informações</h2>
        <p>Utilizamos os dados para responder solicitações, elaborar propostas, executar contratos e melhorar nossos serviços.</p>
        <h2>3. Compartilhamento</h2>
        <p>Não vendemos dados. Poderemos compartilhar estritamente quando exigido por lei ou para prestação de serviços (ex: provedores de e-mail).</p>
        <h2>4. Armazenamento e Segurança</h2>
        <p>Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado.</p>
        <h2>5. Direitos do Titular</h2>
        <p>Você pode solicitar atualização ou exclusão dos seus dados entrando em contato por e-mail.</p>
        <h2>6. Cookies</h2>
        <p>Podemos utilizar cookies essenciais e analíticos. Você pode desativá-los no navegador, porém certas funcionalidades podem ser afetadas.</p>
        <h2>7. Retenção</h2>
        <p>Os dados são mantidos somente pelo tempo necessário para cumprir a finalidade original ou exigências legais.</p>
        <h2>8. Alterações</h2>
        <p>Esta política pode ser atualizada periodicamente. Recomendamos revisão ocasional.</p>
        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Privacidade;
