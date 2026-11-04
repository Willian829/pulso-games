import { Gamepad2 } from 'lucide-react'
import { Link, Route, Routes } from 'react-router-dom'
import { GameSheetProvider } from './components/GameSheet'
import { Layout } from './components/Layout'
import { EmptyState } from './components/ui'
import Awards from './pages/Awards'
import Deals from './pages/Deals'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import MostPlayed from './pages/MostPlayed'
import Releases from './pages/Releases'
import Trending from './pages/Trending'

export default function App() {
  return (
    <GameSheetProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mais-jogados" element={<MostPlayed />} />
          <Route path="/lancamentos" element={<Releases />} />
          <Route path="/promocoes" element={<Deals />} />
          <Route path="/em-alta" element={<Trending />} />
          <Route path="/premiacoes" element={<Awards />} />
          <Route path="/favoritos" element={<Favorites />} />
          <Route
            path="*"
            element={
              <div className="py-20">
                <EmptyState icon={<Gamepad2 className="size-5" />} title="Fase não encontrada">
                  Esta página não existe.{' '}
                  <Link to="/" className="text-accent-text underline">
                    Voltar ao início
                  </Link>
                </EmptyState>
              </div>
            }
          />
        </Routes>
      </Layout>
    </GameSheetProvider>
  )
}
