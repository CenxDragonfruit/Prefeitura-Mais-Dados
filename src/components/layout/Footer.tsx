import { MapPin, Phone, Instagram, Globe, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full mt-auto z-10 relative shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      
      {/* FAIXA DECORATIVA (Ajuste Fino)
        h-3 = 12px (Bem fino e elegante)
        background-size: auto 100% = Garante que a imagem caiba inteira na altura
      */}
      <div 
        className="w-full h-3 bg-white" 
        style={{
          backgroundImage: 'url("https://www.portovelho.ro.gov.br/logo/rodape-pmpv.png")',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'bottom center',
          backgroundSize: 'auto 100%' 
        }}
      />

      {/* Conteúdo Azul */}
      <div className="bg-[#003B8F] text-white pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-sm mb-8 border-b border-white/10 pb-8">
            
            {/* Logo e Descrição */}
            <div className="flex flex-col items-start space-y-4">
              <div className="bg-white/5 p-2 rounded-lg backdrop-blur-sm inline-block">
                <img 
                  src="https://www.portovelho.ro.gov.br/logo/SMTI_horizontal_branco.png" 
                  alt="SMTI Logo" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-white/70 text-xs leading-relaxed max-w-xs font-light">
                Tecnologia e inovação para uma gestão pública eficiente.
              </p>
              
              <div className="flex gap-2 pt-1">
                <a href="https://www.instagram.com/smti_pvh_/" target="_blank" className="social-icon">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="https://smti.portovelho.ro.gov.br/" target="_blank" className="social-icon">
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Navegação */}
            <div className="md:pl-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-4">Acesso Rápido</h4>
              <ul className="space-y-2 text-xs text-white/80">
                <li><a href="/" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="/modulos" className="hover:text-white transition-colors">Sistemas</a></li>
                <li><a href="/aprovacoes" className="hover:text-white transition-colors">Aprovações</a></li>
                <li className="pt-2">
                  <a href="https://smti.portovelho.ro.gov.br/" target="_blank" className="flex items-center gap-1 text-yellow-400 hover:text-white transition-colors">
                    Portal SMTI <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-4">Contato</h4>
              <div className="space-y-3 text-xs text-white/80">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-yellow-400 shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60 uppercase">Telefone</span>
                    <span className="font-medium text-sm">(69) 3901-3079</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60 uppercase">Endereço</span>
                    <span className="leading-tight">
                      R. Dom Pedro II, 826 - Centro<br/>
                      Porto Velho - RO, 76801-066
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center text-[10px] text-white/40 uppercase tracking-wider">
            <p>© {new Date().getFullYear()} SMTI - Porto Velho</p>
            <p>Desenvolvido internamente</p>
          </div>
        </div>
      </div>

      <style>{`
        .social-icon {
          @apply flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-yellow-400 hover:text-[#003B8F] transition-all duration-200;
        }
      `}</style>
    </footer>
  );
}