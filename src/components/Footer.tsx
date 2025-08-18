
const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-cco-blue-dark">Contato</h3>
            <div className="space-y-2 text-gray-600">
              <p>Email: contato@ccoenergy.com.br</p>
              <p>Telefone: (11) 1234-5678</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-cco-blue-dark">Links Úteis</h3>
            <ul className="space-y-2">
              <li>
                <a href="/sobre" className="text-gray-600 hover:text-cco-blue-dark">Sobre Nós</a>
              </li>
              <li>
                <a href="/suporte" className="text-gray-600 hover:text-cco-blue-dark">Suporte</a>
              </li>
              <li>
                <a href="/privacidade" className="text-gray-600 hover:text-cco-blue-dark">Política de Privacidade</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-cco-blue-dark">Horário de Atendimento</h3>
            <p className="text-gray-600">Segunda a Sexta</p>
            <p className="text-gray-600">9h às 18h</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-gray-500">
          <div className="flex justify-center mb-4">
            <img src="/cco-logo.png" alt="CCO ENERGY" className="h-10" />
          </div>
          <p>&copy; {new Date().getFullYear()} CCO ENERGY. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
