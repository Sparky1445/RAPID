import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// StrictMode stays off for now. It was disabled for react-leaflet, which is
// gone; re-enabling it is a separate change that needs the whole app checked
// against a dev-mode double-mount.
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />,
)
