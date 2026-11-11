import { concluirDemanda, devolverDemanda } from '../../api/demandasApi.js';
import FormularioModal from './FormularioModal.jsx';

const CAMPOS_CONCLUSAO = [
  { nome: 'resultadoFinal', rotulo: 'Resultado final', obrigatorio: true, max: 4000 },
  { nome: 'justificativa', rotulo: 'Justificativa', obrigatorio: true, max: 2000 },
];
const CAMPOS_DEVOLUCAO = [
  {
    nome: 'justificativa',
    rotulo: 'Justificativa (o que precisa ser ajustado)',
    obrigatorio: true,
    max: 2000,
  },
];

/** Conclusão (→ FINALIZADA) ou devolução (→ EM_ANDAMENTO) de demanda com fiscalização registrada. */
export default function ConclusaoModal({ demanda, modo, onClose, onSucesso }) {
  if (modo === 'DEVOLVER') {
    return (
      <FormularioModal
        titulo={`Devolver ${demanda.numero}`}
        rotuloFormulario="Devolver demanda"
        ajuda="A demanda volta para Em andamento para ajustes na fiscalização."
        campos={CAMPOS_DEVOLUCAO}
        rotuloEnviar="Devolver"
        variante="warning"
        mensagemSucesso="Demanda devolvida ao fiscal."
        mensagemFalha="Não foi possível devolver a demanda."
        enviar={(corpo) => devolverDemanda(demanda.id, corpo)}
        onClose={onClose}
        onSucesso={onSucesso}
      />
    );
  }
  return (
    <FormularioModal
      titulo={`Concluir ${demanda.numero}`}
      rotuloFormulario="Concluir demanda"
      ajuda="A demanda será finalizada e deixará de aceitar novas ações."
      campos={CAMPOS_CONCLUSAO}
      rotuloEnviar="Concluir"
      mensagemSucesso="Demanda concluída com sucesso."
      mensagemFalha="Não foi possível concluir a demanda."
      enviar={(corpo) => concluirDemanda(demanda.id, corpo)}
      onClose={onClose}
      onSucesso={onSucesso}
    />
  );
}
