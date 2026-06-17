import { useState } from "react";
import { BrandStrip } from "../components/customer/BrandStrip";
import { ChatWidget } from "../components/customer/ChatWidget";
import { ClosedBanner } from "../components/customer/ClosedBanner";
import { Footer } from "../components/customer/Footer";
import { Header } from "../components/customer/Header";
import { Hero } from "../components/customer/Hero";
import { HowItWorks } from "../components/customer/HowItWorks";
import { MenuSection } from "../components/customer/MenuSection";
import { useMenu } from "../hooks/useMenu";
import { useStoreStatus } from "../hooks/useStoreStatus";

export function HomePage() {
  const { menu } = useMenu();
  const { isOpen: isStoreOpen } = useStoreStatus();
  const [chatOpen, setChatOpen] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  function openChat(message?: string) {
    if (message && !isStoreOpen) return;
    if (message) setQueuedMessage(message);
    setChatOpen(true);
  }

  return (
    <>
      <ClosedBanner />
      <Header onOrderClick={() => openChat()} isStoreOpen={isStoreOpen} />
      <main>
        <Hero onOrderClick={() => openChat()} isStoreOpen={isStoreOpen} />
        <HowItWorks />
        <MenuSection
          menu={menu}
          onItemClick={(name) => openChat(`I'd like a ${name}`)}
          onOrderClick={() => openChat()}
          isStoreOpen={isStoreOpen}
        />
        <BrandStrip />
        <Footer />
      </main>
      <ChatWidget
        open={chatOpen}
        onOpenChange={setChatOpen}
        menu={menu}
        isStoreOpen={isStoreOpen}
        queuedMessage={queuedMessage}
        onQueueConsumed={() => setQueuedMessage(null)}
      />
    </>
  );
}
