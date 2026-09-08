import './globals.css'
import { EstimateProvider } from './context/EstimateContext'
import { ProjectProvider } from './context/ProjectContext'
import ThemeWrapper from './components/ThemeWrapper'

export const metadata = {
  title: 'Shadow Estimator',
  description: 'Trade estimating tool with smart accessory dependencies',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <EstimateProvider>
          <ProjectProvider>
            <ThemeWrapper>
              {children}
            </ThemeWrapper>
          </ProjectProvider>
        </EstimateProvider>
      </body>
    </html>
  )
}
