const steps = [
  {
    num: "01",
    title: "Open the chat",
    text: "Tap the chat button anywhere on the page. No sign-up required.",
  },
  {
    num: "02",
    title: "Say what you want",
    text: 'Order like you\'re texting a friend — "2 flat whites and a croissant" works perfectly.',
  },
  {
    num: "03",
    title: "Confirm & done",
    text: "We summarise your order and total. Confirm once and you're all set.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-espresso/8 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-serif text-4xl font-medium md:text-5xl">How ordering works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.num}
              className="rounded-[18px] border border-white/90 bg-white p-8 shadow-[0_8px_30px_rgba(26,18,14,0.08)]"
            >
              <p className="font-serif text-4xl font-semibold leading-none text-terracotta/35">{step.num}</p>
              <h3 className="mt-3 text-base font-medium">{step.title}</h3>
              <p className="mt-2 text-sm font-light text-warm-gray">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
