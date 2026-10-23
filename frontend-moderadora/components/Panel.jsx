export function Panel({ title, children, className='' }) {
  return <section className={`glass-panel ${className}`}><h2 className="panel-heading">{title}</h2><div className="panel-content">{children}</div></section>;
}
export function GradientButton({children,className='',...props}) {
  return <button className={`gradient-button ${className}`} {...props}>{children}</button>;
}
export function Notice({message,type='error'}) {
  if (!message) return null;
  return <p role={type==='error'?'alert':'status'} className={`notice notice--${type}`}>{message}</p>;
}
