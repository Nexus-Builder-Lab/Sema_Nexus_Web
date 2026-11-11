import { registrarFiscalizacao } from '../../api/demandasApi.js';
import FormularioModal from './FormularioModal.jsx';

export const AVISO_FISCALIZACAO = 'Não gera auto de infração nem substitui sistemas oficiais.';

const CAMPOS = [
  { nome: 'data', rotulo: 'Data da fiscalização', tipo: 'date', obrigatorio: true, futuro: false },
  { nome: 'atividades', rotulo: 'Atividades realizadas', obrigatorio: true, max: 4000 },
  { nome: 'resultado', rotulo: 'Resultado', obrigatorio: true, max: 4000 },
  { nome: 'evidencias', rotulo: 'Evidências (fictícias, em texto)', obrigatorio: true, max: 4000 },
  { nome: 'recomendacoes', rotulo: 'Recomendações', max: 4000 },
];

/** Registro da fiscalização (EM_ANDAMENTO → AGUARDANDO_CONCLUSAO). A equipe é a da demanda. */
export default function FiscalizacaoModal({ demanda, onClose, onSucesso }) {
  return (
    <FormularioModal
      titulo={`Registrar fiscalização — ${demanda.numero}`}
      rotuloFormulario="Registrar fiscalização"
      ajuda={`Equipe: ${demanda.equipe?.nome ?? '—'}. Após o registro, a demanda aguarda a conclusão.`}
      aviso={AVISO_FISCALIZACAO}
      campos={CAMPOS}
      rotuloEnviar="Registrar fiscalização"
      mensagemSucesso="Fiscalização registrada com sucesso."
      mensagemFalha="Não foi possível registrar a fiscalização."
      enviar={(corpo) => registrarFiscalizacao(demanda.id, corpo)}
      onClose={onClose}
      onSucesso={onSucesso}
    />
  );
}
