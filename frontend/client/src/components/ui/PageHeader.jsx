export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="ui-page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="button-row">{actions}</div> : null}
    </div>
  )
}
