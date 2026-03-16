import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustedBySection from "@/components/TrustedBySection";
import WhyAttendSection from "@/components/WhyAttendSection";
import SpeakersSection from "@/components/SpeakersSection";
import AgendaSection from "@/components/AgendaSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TrustedBySection />
      <div id="why">
        <WhyAttendSection />
      </div>
      <div id="speakers">
        <SpeakersSection />
      </div>
      <div id="agenda">
        <AgendaSection />
      </div>
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
