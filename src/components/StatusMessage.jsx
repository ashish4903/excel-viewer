import Icon from './Icon.jsx'

// kind: 'info' | 'warning' | 'error'
function StatusMessage({ kind = 'info', children }) {
  return (
    <div className={`status status-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={kind === 'info' ? 'search' : 'alert'} />
      <div>{children}</div>
    </div>
  )
}

export default StatusMessage
