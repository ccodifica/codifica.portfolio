import Header from "@/components/Header";
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.state && (location.state as any).target === 'contact') {
      const contact = document.getElementById('contact');
      if (contact) {
        // pequeno delay para garantir render
        setTimeout(() => contact.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }
  }, [location.state]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;