import Image from 'next/image'

export default function ProcesVisual() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: '#F8F7F5' }}>
      <div className="container-site">
        <div className="text-center mb-10 md:mb-14">
          <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#F15025' }}>
            Hoe het werkt
          </p>
          <h2 className="font-heading text-[28px] md:text-[40px] font-extrabold text-petrol tracking-[-1.5px] leading-[1.05]">
            Eén project. Alles geregeld<span className="text-flame">.</span>
          </h2>
          <p className="text-[16px] md:text-[18px] mt-3 leading-relaxed" style={{ color: '#6B6B66' }}>
            Van klant tot oplevering — in één cockpit.
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto rounded-2xl bg-white p-6 md:p-10 shadow-[0_2px_40px_rgba(26,83,92,0.06)]">
          <Image
            src="/images/proces-doen.webp"
            alt="Van klant tot oplevering — het doen. proces"
            width={1920}
            height={1080}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>

        <p className="text-center text-[15px] md:text-[16px] mt-10 md:mt-14 leading-relaxed" style={{ color: '#9B9B95' }}>
          Ontdek hieronder de modules<span style={{ color: '#F15025' }}>.</span>
        </p>
      </div>
    </section>
  )
}
