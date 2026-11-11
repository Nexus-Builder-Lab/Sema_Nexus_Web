import { registrarAtividade } from '../../api/demandasApi.js';
import FormularioModal from './FormularioModal.jsx';

const CAMPOS = [
  { nome: 'descricao', rotulo: 'Descrição da atividade', obrigatorio: true, max: 2000, linhas: 4 },
  { nome: 'data', rotulo: 'Data', tipo: 'date', futuro: false },
];

/** Registro de atividade/observação no histórico (demanda EM_ANDAMENTO; não muda o status). */
export default function AtividadeForm({ demanda, onClose, onSucesso }) {
  return (
    <FormularioModal
      titulo={`Registrar atividade — ${demanda.numero}`}
      rotuloFormulario="Registrar atividade"
      campos={CAMPOS}
      rotuloEnviar="Registrar atividade"
      mensagemSucesso="Atividade registrada no histórico."
      mensagemFalha="Não foi possível registrar a atividade."
      enviar={(corpo) => registrarAtividade(demanda.id, corpo)}
      onClose={onClose}
      onSucesso={onSucesso}
    />
  );
}
