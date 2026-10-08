import Header from "@/components/Header";
import Hero from "@/components/Hero";
import UploadTool from "@/components/UploadTool";
import Showcase from "@/components/Showcase";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <UploadTool />
        <Showcase />
        <Features />
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
