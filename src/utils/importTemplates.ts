
import { loadXlsx } from './lazyXlsx';

export type TemplateType = 'inventory' | 'clients' | 'resellers' | 'sales' | 'providers';

export const downloadTemplate = async (type: TemplateType) => {
  const XLSX = await loadXlsx();
  let data: any[] = [];
  let filename = '';

  switch (type) {
    case 'inventory':
      data = [
        {
          servicio: 'Netflix',
          correo: 'ejemplo@correo.com',
          contraseña: 'password123',
          pantallas: 5,
          tipo: 'por_pantalla', // por_pantalla | cuenta_completa
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-02-01',
          notas: 'Nota opcional',
          pais: 'Global'
        }
      ];
      filename = 'plantilla_inventario.xlsx';
      break;
    case 'clients':
      data = [
        {
          nombre: 'Juan Perez',
          telefono: '573001234567',
          telegram: '@juanp',
          notas: 'Cliente frecuente',
          revendedor_codigo: '' // Opcional
        }
      ];
      filename = 'plantilla_clientes.xlsx';
      break;
    case 'resellers':
      data = [
        {
          nombre: 'Socio A',
          whatsapp: '573001234567',
          telegram: '@socio_a',
          codigo: 'SOC-01'
        }
      ];
      filename = 'plantilla_revendedores.xlsx';
      break;
    case 'sales':
      data = [
        {
          cliente: 'Juan Perez', 
          telefono_cliente: '573001234567',
          servicio: 'Netflix',
          cuenta_correo: 'admin@netflix.com', // Cuenta madre/inventario
          tipo_cuenta: 'pantalla', // pantalla | unica | completa
          correo_invitado: '', // Solo si es tipo 'unica'
          contraseña_invitado: '', // Solo si es tipo 'unica'
          duracion_meses: 1,
          monto: 3.50,
          revendedor: 'Socio A' // Nombre exacto del revendedor
        }
      ];
      filename = 'plantilla_ventas.xlsx';
      break;
    case 'providers':
      data = [
        {
          nombre: 'Proveedor X',
          whatsapp: '573001234567',
          telegram: '@prov_x'
        }
      ];
      filename = 'plantilla_proveedores.xlsx';
      break;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  XLSX.writeFile(wb, filename);
};
