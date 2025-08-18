
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "./ui/button";

const Header = () => {
  return (
    <header className="w-full py-4 px-6 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img src="/cco-logo.png" alt="CCO ENERGY" className="h-10" />
        </div>
        <div className="space-x-4">
          <Button variant="outline" className="hidden sm:inline-flex items-center border-cco-blue-dark text-cco-blue-dark hover:bg-cco-blue-light/10" onClick={() => window.location.href = "/register"}>
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastre-se
          </Button>
          <Button className="bg-cco-blue-dark hover:bg-cco-blue-dark/90 text-white" onClick={() => window.location.href = "/login"}>
            <LogIn className="w-4 h-4 mr-2" />
            Entrar
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
