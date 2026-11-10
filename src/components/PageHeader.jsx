export default function PageHeader({ title, description, module, actions }) {
  return (
    <header className="nx-page-header">
      <div className="min-w-0">
        {module && <div className="nx-module-tag">{module}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
