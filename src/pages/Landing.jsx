import React from 'react'
import Header from '../components/Landing/Header'
import Hero from '../components/Landing/Hero'
import  Services from '../components/Landing/Services'
import Benefits from '../components/Landing/Benefits'
import Testimonials from '../components/Landing/Testimonials'
import Footer from '../components/Landing/Footer'
import '../components/Landing/landing.css'

const Landing = () => {
  return (
    <div>
      <Header/>
      <Hero/>
      <Services/>
      <Benefits/>
      <Testimonials/>
      <Footer/>
    </div>
  )
}

export default Landing
