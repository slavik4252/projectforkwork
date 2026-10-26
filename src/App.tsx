import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Channels from "@/components/Channels";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import CrmPanel from "@/components/crm/CrmPanel";

function App() {
  const [crmOpen, setCrmOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page text-[#0b1626]">
      <Navbar onCrmClick={() => setCrmOpen(true)} />
      <main>
        <Hero />
        <HowItWorks />
        <Channels />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
      <ChatWidget />
      <CrmPanel open={crmOpen} onClose={() => setCrmOpen(false)} />
    </div>
  );
}

export default App;
