import { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import BrandStory from '@/components/BrandStory';
import CustomOrder from '@/components/CustomOrder';
import Workshop from '@/components/Workshop';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const handleExplore = () => {
    const element = document.getElementById('products');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCustom = () => {
    const element = document.getElementById('custom');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 md:pt-20">
        <Hero onExplore={handleExplore} onCustom={handleCustom} />
        <ProductGrid />
        <BrandStory />
        <CustomOrder />
        <Workshop />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
