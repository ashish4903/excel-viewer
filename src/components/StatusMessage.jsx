import Icon from './Icon.jsx'

// kind: 'info' | 'warning' | 'error'; detail: optional technical text shown in a collapsible section.
function StatusMessage({ kind = 'info', detail, children }) {
  return (
    <div className={`status status-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={kind === 'info' ? 'search' : 'alert'} />
      <div className="status-body">
        <div>{children}</div>
        {detail && (
          <details className="status-detail">
            <summary>Technical details</summary>
            <pre>{detail}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default StatusMessage
