interface PlaceholderPageProps {
  title: string;
  phase: string;
}

function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
        PLANNED ARCHITECTURE
      </span>
      <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
        {title}
      </h1>
      <p className="mt-2 text-xs text-[#97979d]">
        This operational module is scheduled for implementation in {phase}.
      </p>
    </div>
  );
}

export default PlaceholderPage;