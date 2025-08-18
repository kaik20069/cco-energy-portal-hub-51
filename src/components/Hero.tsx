
import { Button } from "./ui/button";
import { UserPlus } from "lucide-react";

const Hero = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Bem-vindo ao Portal do Cliente da CCO ENERGY
        </h1>
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          Aqui você acompanha seus relatórios mensais de gestão e acessa seus boletos de pagamento de forma segura e prática.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg"
            className="bg-cco-blue-dark hover:bg-cco-blue-dark/90 text-white text-lg px-8 py-6"
            onClick={() => window.location.href = "/login"}
          >
            Acessar Portal
          </Button>
          <Button 
            variant="ghost"
            size="lg"
            className="text-cco-blue-dark hover:text-cco-blue-dark/90 hover:bg-cco-blue-light/10 text-lg"
            onClick={() => window.location.href = "/register"}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Ainda não tem conta? Cadastre-se aqui
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
