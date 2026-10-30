const REPO_URL = 'https://github.com/ashish4903/excel-viewer'

const builtAt = __APP_BUILT_AT__ ? new Date(__APP_BUILT_AT__) : null
const builtLabel = builtAt?.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Shows the app's version and the commit the running build came from, so you can tell which version is live.
function AppFooter() {
  return (
    <footer className="app-footer">
      <span>
        <a href={`${REPO_URL}/releases/tag/v${__APP_VERSION__}`} target="_blank" rel="noreferrer">
          Version {__APP_VERSION__}
        </a>
        {__APP_COMMIT__ ? (
          <>
            {' '}
            (
            <a href={`${REPO_URL}/commit/${__APP_COMMIT__}`} target="_blank" rel="noreferrer" aria-label={`commit ${__APP_COMMIT__.slice(0, 7)}`}>
              <code>{__APP_COMMIT__.slice(0, 7)}</code>
            </a>
            )
          </>
        ) : (
          ' (development)'
        )}
      </span>
      {builtAt && (
        <span>
          Built <time dateTime={__APP_BUILT_AT__}>{builtLabel}</time>
        </span>
      )}
      <span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </span>
    </footer>
  )
}

export default AppFooter
