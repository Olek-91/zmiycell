import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/MainLayout'
import { WorkersPage } from './pages/Workers'
import { Dashboard } from './pages/Dashboard'
import { Logs } from './pages/Logs'
import { Tools } from './pages/Tools'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="logs" element={<Logs />} />
        <Route path="tools" element={<Tools />} />
      </Route>
    </Routes>
  )
}

export default App
