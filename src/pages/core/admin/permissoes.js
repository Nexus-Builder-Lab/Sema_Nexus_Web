import {
  PERFIS_ADMIN,
  PERFIS_DISTRIBUICAO,
  PERFIS_EDICAO_DEMANDA,
  PERFIS_ESCRITA_DOCUMENTO,
  PERFIS_RELATORIOS,
} from '../../../auth/perfis.js';
import { PERFIS } from './validarAdmin.js';

// Matriz de permissões por perfil (somente leitura), espelhando as regras da API; quem autoriza é a API., derivada das regras de interface espelhadas da API (a API autoriza).
export const PERMISSOES = [
  {
    chave: 'ver',
    rotulo: 'Consultar demandas, documentos e indicadores',
    perfis: PERFIS.map((p) => p.codigo),
  },
  { chave: 'demandas', rotulo: 'Cadastrar e editar demandas', perfis: PERFIS_EDICAO_DEMANDA },
  {
    chave: 'distribuir',
    rotulo: 'Distribuir demandas e encerrar fiscalizações',
    perfis: PERFIS_DISTRIBUICAO,
  },
  {
    chave: 'fiscalizar',
    rotulo: 'Executar fiscalização (fiscal designado)',
    perfis: ['ADMIN', 'GESTOR', 'FISCAL'],
  },
  { chave: 'documentos', rotulo: 'Enviar e vincular documentos', perfis: PERFIS_ESCRITA_DOCUMENTO },
  { chave: 'relatorios', rotulo: 'Relatórios gerenciais', perfis: PERFIS_RELATORIOS },
  {
    chave: 'admin',
    rotulo: 'Área administrativa (usuários, setores, auditoria)',
    perfis: PERFIS_ADMIN,
  },
];
