import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

let mounted = false
function mount() {
  if (mounted) return
  mounted = true
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

const ni = window.netlifyIdentity
if (ni) {
  // Wait for Netlify Identity to resolve the session before rendering.
  // This prevents the app from rendering in a broken auth state where
  // currentUser() hasn't resolved yet but authLoading is already false.
  ni.on('init', mount)
  // Fallback: mount anyway if identity fails to initialize within 5 seconds.
  setTimeout(mount, 5000)
} else {
  mount()
}
