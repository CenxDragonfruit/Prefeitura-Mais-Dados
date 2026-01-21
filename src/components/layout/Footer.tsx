import { MapPin, Phone, Instagram, Globe, ExternalLink, LifeBuoy } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full mt-auto z-10 relative bg-[#003B8F] shadow-inner border-t border-[#004BC0]">
      
      {/* CONTEÚDO PRINCIPAL (Azul) */}
      <div className="pt-12 pb-8 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-sm mb-10 border-b border-white/10 pb-10">
            
            {/* COLUNA 1: Identidade */}
            <div className="flex flex-col items-start space-y-5">
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm inline-block border border-white/5">
                <img 
                  src="https://www.portovelho.ro.gov.br/logo/SMTI_horizontal_branco.png" 
                  alt="SMTI Logo" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-blue-100 text-xs leading-relaxed max-w-xs font-light">
                Secretaria Municipal de Tecnologia da Informação, Comunicação e Pesquisa.
              </p>
              
              <div className="flex gap-3 pt-2">
                <a href="https://www.instagram.com/smti_pvh_/" target="_blank" className="social-icon" title="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://smti.portovelho.ro.gov.br/" target="_blank" className="social-icon" title="Portal SMTI">
                  <Globe className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* COLUNA 2: Acesso Rápido */}
            <div className="md:pl-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-5">Acesso Rápido</h4>
              <ul className="space-y-3 text-sm text-blue-50">
                <li><a href="/" className="hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 duration-200">Dashboard</a></li>
                <li><a href="/modulos" className="hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 duration-200">Sistemas</a></li>
                <li><a href="/aprovacoes" className="hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 duration-200">Aprovações</a></li>
                
                {/* Botão GLPI Azul Translúcido */}
                <li className="pt-4 pb-1">
                  <a 
                    href="https://atendimento.portovelho.ro.gov.br/" 
                    target="_blank" 
                    className="flex items-center gap-3 bg-white/10 hover:bg-yellow-400 hover:text-[#003B8F] text-white px-4 py-2.5 rounded-lg border border-white/10 shadow-lg transition-all w-fit group text-xs font-bold"
                  >
                    <LifeBuoy className="h-4 w-4" /> 
                    <span>Abrir Chamado (GLPI)</span>
                  </a>
                </li>

                <li className="pt-2">
                  <a href="https://smti.portovelho.ro.gov.br/" target="_blank" className="flex items-center gap-2 text-yellow-400 hover:text-white transition-colors text-xs font-bold ml-1">
                    Portal SMTI <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* COLUNA 3: Contato */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-5">Contato</h4>
              <div className="space-y-5 text-sm text-blue-50">
                <div className="flex gap-4 items-center group">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-yellow-400 shrink-0 border border-white/5 group-hover:bg-yellow-400 group-hover:text-[#003B8F] transition-all">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-blue-300 uppercase tracking-wide font-medium">Telefone</span>
                    <span className="font-semibold text-white">(69) 3901-3079</span>
                  </div>
                </div>
                <div className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5 border border-white/5 group-hover:bg-yellow-400 group-hover:text-[#003B8F] transition-all">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-blue-300 uppercase tracking-wide font-medium">Endereço</span>
                    <span className="leading-snug block mt-0.5">
                      R. Dom Pedro II, 826 - Centro<br/>
                      Porto Velho - RO, 76801-066
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Copyright e DIAD */}
          <div className="flex flex-col md:flex-row justify-between items-center text-[11px] text-blue-300 uppercase tracking-wide gap-3 text-center md:text-left font-medium">
            <p>© {new Date().getFullYear()} Prefeitura de Porto Velho</p>
            <p className="flex items-center gap-2">
              Desenvolvido e mantido pela <span className="font-bold text-yellow-400">DIAD</span> (Divisão de Administração de Dados e BI)
            </p>
          </div>
        </div>
      </div>

      {/* FAIXA DECORATIVA INFERIOR */}
      <div 
        className="w-full h-3 bg-white" 
        style={{
          backgroundImage: 'url("https://www.portovelho.ro.gov.br/logo/rodape-pmpv.png")',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'bottom center',
          backgroundSize: 'auto 100%' 
        }}
      />

      <style>{`
        .social-icon {
          @apply flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-yellow-400 hover:text-[#003B8F] text-white transition-all duration-300 shadow-sm border border-transparent;
        }
      `}</style>
    </footer>
  );
}