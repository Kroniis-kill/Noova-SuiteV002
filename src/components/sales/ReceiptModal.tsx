
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import Modal from '../ui/Modal';
import { Sale, Client } from '../../types';
import { useData } from '../../context/DataContext';
import { Download, Share2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  client: Client;
  zIndex?: number;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sales, client, zIndex = 10000 }) => {
  const { settings } = useData();
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Toggle for currency: 'main' or 'secondary'
  const [currencyMode, setCurrencyMode] = useState<'main' | 'secondary'>('main');

  if (!isOpen || typeof document === 'undefined' || !document.body) return null;

  const rate = settings.exchangeRate || 1;
  const isSecondary = currencyMode === 'secondary';
  const displayCurrency = isSecondary ? (settings.subCurrency || 'SEC') : (settings.currency || '$');
  
  const calculateAmount = (amt: number) => {
     if (!isSecondary) return amt;
     // Convert logic
     // Assuming main is Strong (USD), Secondary is Weak (Bs) -> Multiply
     // If main is Weak, Secondary Strong -> Divide
     const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
     const isMainStrong = strongCurrencies.includes(settings.currency || 'USD');
     
     if (isMainStrong) return amt * rate;
     return rate > 0 ? amt / rate : 0;
  };

  const totalAmount = sales.reduce((acc, s) => acc + s.amount, 0);
  const totalPaid = sales.reduce((acc, s) => acc + (s.isPartial ? (s.initialPayment || 0) : s.amount), 0);
  const totalDebt = totalAmount - totalPaid;
  const hasDebt = totalDebt > 0;

  const displayTotal = calculateAmount(totalAmount);
  const displayPaid = calculateAmount(totalPaid);
  const displayDebt = calculateAmount(totalDebt);

  // Business Info
  const businessInfo = settings.businessInfo;
  const businessName = businessInfo?.name || "Noova Suite";
  const logoUrl = businessInfo?.logo;

  // QR Code
  const identifier = client.slug || client.id;
  const baseUrl = 'https://noova-suite.vercel.app';
  const portalLink = `${baseUrl}/portal-cliente/${identifier}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalLink)}&color=27272a&bgcolor=ffffff`;

  const filterFonts = (node: HTMLElement) => {
    if (node.tagName === 'LINK' && node.getAttribute('href')?.includes('fonts.googleapis')) {
        return false;
    }
    return true;
  };

  const handleDownload = async () => {
    if (receiptRef.current) {
      try {
        const dataUrl = await toPng(receiptRef.current, { 
            cacheBust: true, 
            pixelRatio: 3,
            filter: filterFonts 
        });
        const link = document.createElement('a');
        link.download = `Recibo-${client.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error generando imagen', err);
      }
    }
  };

  const handleShare = async () => {
    if (receiptRef.current && navigator.share) {
        try {
            const dataUrl = await toPng(receiptRef.current, { 
                cacheBust: true, 
                pixelRatio: 3,
                filter: filterFonts
            });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "recibo.png", { type: "image/png" });
            await navigator.share({
                files: [file],
                title: 'Comprobante de Venta',
                text: `Hola ${client.name}, aquí tienes tu comprobante.`
            });
        } catch (err) {
            console.error('Sharing failed', err);
        }
    } else {
        handleDownload();
    }
  };

  return createPortal(
    <Modal isOpen={isOpen} onClose={onClose} title="Generar Comprobante" zIndex={zIndex}>
       <div className="flex flex-col items-center pt-2 pb-4">
          
          {/* Currency Toggle */}
          {settings.subCurrency && (
              <div className="flex bg-surface-zinc p-1 rounded-sm border border-white/10 mb-4 w-full max-w-[360px]">
                  <button 
                    onClick={() => setCurrencyMode('main')}
                    className={`flex-1 py-2 text-[10px] font-semibold rounded-xs transition-all ${currencyMode === 'main' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                  >
                     {settings.currency}
                  </button>
                  <button 
                    onClick={() => setCurrencyMode('secondary')}
                    className={`flex-1 py-2 text-[10px] font-semibold rounded-xs transition-all flex items-center justify-center gap-1 ${currencyMode === 'secondary' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                  >
                     <RefreshCw size={10} /> {settings.subCurrency}
                  </button>
              </div>
          )}

          {/* --- RECEIPT PREVIEW AREA --- */}
          <div className="w-full overflow-x-auto flex justify-center mb-6">
             <div 
               ref={receiptRef}
               className="bg-text-primary p-8 rounded-xl w-[360px] relative overflow-hidden border border-zinc-200 shadow-2xl text-black"
             >
                {/* Header */}
                <div className="flex flex-col items-center mb-8 relative z-10">
                   <div className="mb-3">
                       {logoUrl ? (
                           <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                       ) : (
                           <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl">
                               {businessName.substring(0,1).toUpperCase()}
                           </div>
                       )}
                   </div>
                   <h2 className="text-black font-bold text-lg tracking-wide uppercase text-center">{businessName}</h2>
                   <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Comprobante de Pago</p>
                   <p className="text-zinc-400 text-[9px]">{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
                </div>

                {/* Client Info */}
                <div className="mb-6 border-b border-dashed border-zinc-300 pb-6 relative z-10">
                   <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cliente</p>
                   <p className="text-black font-bold text-sm">{client.name}</p>
                   <p className="text-zinc-500 text-xs">{client.phone}</p>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-8 relative z-10">
                   {sales.map((s, idx) => {
                       const isPartial = s.isPartial;
                       const debt = isPartial ? s.amount - (s.initialPayment || 0) : 0;
                       return (
                           <div key={idx} className="flex justify-between items-start">
                               <div className="flex flex-col">
                                   <span className="text-black font-semibold text-xs">{s.serviceName}</span>
                                   <span className="text-[9px] text-zinc-500">{s.saleType?.replace('_', ' ')}</span>
                                   {isPartial && <span className="text-[9px] text-red-500 font-bold">Debe: {displayCurrency}{calculateAmount(debt).toFixed(2)}</span>}
                               </div>
                               <span className="text-black text-xs font-mono font-bold">{displayCurrency}{calculateAmount(s.amount).toFixed(2)}</span>
                           </div>
                       );
                   })}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-zinc-300 pt-4 relative z-10 mb-6">
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-zinc-500 text-xs">Total</span>
                       <span className="text-black font-extrabold text-lg">{displayCurrency}{displayTotal.toFixed(2)}</span>
                   </div>
                   {hasDebt ? (
                       <>
                           <div className="flex justify-between items-center mb-2">
                               <span className="text-zinc-500 text-xs">Abonado</span>
                               <span className="text-emerald-600 font-bold text-sm">{displayCurrency}{displayPaid.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                               <span className="text-red-500 text-xs font-semibold uppercase">Pendiente</span>
                               <span className="text-red-500 font-bold text-base">{displayCurrency}{displayDebt.toFixed(2)}</span>
                           </div>
                       </>
                   ) : (
                       <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center justify-center gap-2">
                           <CheckCircle2 size={14} className="text-emerald-600" />
                           <span className="text-[10px] font-semibold text-emerald-600 uppercase">Pagado Completamente</span>
                       </div>
                   )}
                </div>

                {/* QR Section */}
                <div className="flex flex-col items-center justify-center pt-4 border-t border-zinc-100">
                    <img src={qrUrl} alt="QR" className="w-24 h-24 mix-blend-multiply" />
                    <p className="text-[8px] text-zinc-400 mt-2 text-center max-w-[150px]">
                        Escanea para ver tus credenciales actualizadas
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center relative z-10">
                   <p className="text-[8px] text-zinc-400 mt-1">Generado por {businessName}</p>
                </div>
             </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
             <button onClick={handleDownload} className="h-[50px] rounded-md bg-surface-3 border border-white/10 text-zinc-300 font-semibold text-xs hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95">
                <Download size={18} /> Guardar
             </button>
             <button onClick={handleShare} className="h-[50px] rounded-md bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold text-xs shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2 hover:brightness-110">
                <Share2 size={18} /> Compartir
             </button>
          </div>

       </div>
    </Modal>,
    document.body
  );
};

export default ReceiptModal;
