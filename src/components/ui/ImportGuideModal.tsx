
import React from 'react';
import Modal from './Modal';
import { FileSpreadsheet, Upload, AlertCircle, Download } from 'lucide-react';
import { downloadTemplate, TemplateType } from '../../utils/importTemplates';

interface ImportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  columns?: string[]; // Made optional since we are hiding it
  title?: string;
  type: TemplateType; 
}

const ImportGuideModal: React.FC<ImportGuideModalProps> = ({ isOpen, onClose, onConfirm, title = "Importar Datos", type }) => {
  
  const handleDownload = () => {
      void downloadTemplate(type);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5 pt-1">
        
        <div className="bg-status-info/10 border border-status-info/20 rounded-md p-4 flex gap-4 items-start">
           <div className="bg-status-info/20 p-2.5 rounded-full bg-opacity-50 text-status-info-soft shrink-0">
              <FileSpreadsheet size={20} />
           </div>
           <div>
              <h4 className="text-status-info-soft font-bold text-sm">Instrucciones</h4>
              <p className="text-secondary text-xs mt-1 leading-relaxed">
                 1. Descarga la plantilla oficial.<br/>
                 2. Llena los datos correspondientes en el Excel.<br/>
                 3. Sube el archivo (.xlsx) para procesar.
              </p>
           </div>
        </div>

        {/* Removed 'Required Columns' section as requested */}

        <div className="grid grid-cols-2 gap-3 pt-2">
           <button 
             onClick={handleDownload}
             className="w-full h-[48px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 hover:bg-[rgb(var(--fg-rgb))]/5 text-secondary rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-[12px] active:scale-95"
           >
              <Download size={16} /> Bajar Plantilla
           </button>

           <button 
             onClick={() => { onConfirm(); onClose(); }}
             className="w-full h-[48px] bg-gradient-to-r from-brand-primary to-brand-accent hover:brightness-110 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(106,44,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[12px]"
           >
              <Upload size={16} /> Subir Archivo
           </button>
        </div>

      </div>
    </Modal>
  );
};

export default ImportGuideModal;
