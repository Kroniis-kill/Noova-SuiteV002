
import React from 'react';
import Modal from './Modal';
import { AlertTriangle, RefreshCw, SkipForward, CheckCircle2 } from 'lucide-react';

interface ImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: any[];
  newEntries: any[];
  onResolve: (strategy: 'update' | 'skip') => void;
}

const ImportConflictModal: React.FC<ImportConflictModalProps> = ({ isOpen, onClose, duplicates, newEntries, onResolve }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conflicto de Importación" zIndex={20000}>
      <div className="space-y-5 pt-1">
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-4 items-start">
           <div className="bg-amber-500/20 p-2.5 rounded-full shrink-0 text-amber-500">
              <AlertTriangle size={24} />
           </div>
           <div>
              <h4 className="text-amber-500 font-bold text-sm mb-1">Duplicados Detectados</h4>
              <p className="text-zinc-300 text-xs leading-relaxed">
                 Hemos encontrado <strong>{duplicates.length} cuentas</strong> que ya existen en tu inventario (coinciden por correo y servicio).
              </p>
              <div className="mt-2 text-[10px] text-zinc-400 bg-black/20 p-2 rounded-lg border border-white/5">
                 Adicionalmente se crearán <strong>{newEntries.length}</strong> cuentas nuevas.
              </div>
           </div>
        </div>

        <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">¿Qué deseas hacer con los duplicados?</p>
            
            <button 
               onClick={() => onResolve('update')}
               className="w-full p-4 rounded-md bg-surface-zinc border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-left group flex items-center gap-4"
            >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <RefreshCw size={18} />
                </div>
                <div>
                    <span className="block text-white font-bold text-sm">Actualizar Existentes</span>
                    <span className="block text-zinc-500 text-[10px] mt-0.5">Sobreescribir contraseñas, fechas y estados.</span>
                </div>
            </button>

            <button 
               onClick={() => onResolve('skip')}
               className="w-full p-4 rounded-md bg-surface-zinc border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-left group flex items-center gap-4"
            >
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-400 border border-zinc-500/20 group-hover:scale-110 transition-transform">
                    <SkipForward size={18} />
                </div>
                <div>
                    <span className="block text-white font-bold text-sm">Ignorar Duplicados</span>
                    <span className="block text-zinc-500 text-[10px] mt-0.5">Solo importar las cuentas nuevas ({newEntries.length}).</span>
                </div>
            </button>
        </div>
        
        <div className="pt-2 border-t border-white/5 flex justify-end">
            <button onClick={onClose} className="text-zinc-500 text-xs hover:text-white font-medium transition-colors">
                Cancelar Importación
            </button>
        </div>

      </div>
    </Modal>
  );
};

export default ImportConflictModal;
