import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="container py-5">
      <h1 className="h4">Página não encontrada</h1>
      <p>O endereço acessado não existe.</p>
      <Link to="/">Voltar para o início</Link>
    </main>
  );
}
