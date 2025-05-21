import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Header from './components/Landing/Header'
import Hero from './components/Landing/Hero'
import  Services from './components/Landing/Services'
import Benefits from './components/Landing/Benefits'
import Testimonials from './components/Landing/Testimonials'
import CTA from './components/Landing/cta'
import Footer from './components/Landing/Footer'
import App from './App'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App/>
    <Header/>
    <Hero/>
    <Services/>
    <Benefits/>
    <Testimonials/>
    <CTA/>
    <Footer/>
  </StrictMode>,
)
