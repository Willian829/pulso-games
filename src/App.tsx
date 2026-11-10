import { Gamepad2 } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { GameSheetProvider } from './components/GameSheet'
import { Layout } from './components/Layout'
import { EASE, EmptyState } from './components/ui'
import Awards from './pages/Awards'
import Deals from './pages/Deals'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import MostPlayed from './pages/MostPlayed'
import Releases from './pages/Releases'
import Trending from './pages/Trending'

export default function App() {
  const location = useLocation()
  return (
    <MotionConfig reducedMotion="user">
      <GameSheetProvider>
        <Layout>
          {/* Transição entre páginas: a antiga some rápido, a nova sobe suavemente */}
          <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.14, ease: 'easeIn' } }}
            >
              <Routes location={location}>
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
                      <EmptyState icon={<Gamepad2 className="size-6" />} title="Fase não encontrada">
                        Esta página não existe.{' '}
                        <Link to="/" className="text-accent-text underline underline-offset-4">
                          Voltar ao início
                        </Link>
                      </EmptyState>
                    </div>
                  }
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Layout>
      </GameSheetProvider>
    </MotionConfig>
  )
}
