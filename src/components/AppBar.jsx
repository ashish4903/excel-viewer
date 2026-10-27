import ThemeToggle from './ThemeToggle.jsx'
import Icon from './Icon.jsx'

function AppBar({ subtitle = 'Explore your spreadsheets right in the browser', actions }) {
  return (
    <header className="app-bar">
      <div className="app-bar-inner">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="sheet" size={22} />
          </span>
          <div>
            <h1>Excel Viewer</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="app-bar-actions">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default AppBar
