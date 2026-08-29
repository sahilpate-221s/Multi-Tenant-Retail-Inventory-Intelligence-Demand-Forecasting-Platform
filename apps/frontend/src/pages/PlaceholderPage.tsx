interface PlaceholderPageProps {
  title: string;
  phase: string;
}

function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        This page will be built in {phase}.
      </p>
    </div>
  );
}

export default PlaceholderPage;