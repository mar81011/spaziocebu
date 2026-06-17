const steps = [
  {
    num: "01",
    title: "Pick your drinks",
    text: "Browse the menu below and tap what you want — or open chat and tell us your order.",
  },
  {
    num: "02",
    title: "Confirm in chat",
    text: 'We summarise your order and total. Reply confirm, then pay via GCash.',
  },
  {
    num: "03",
    title: "Pick up",
    text: "We'll notify you when your order is ready for pickup.",
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
