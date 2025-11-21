import CurrencyCrisisLab from './CurrencyCrisisLab';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Interactive sandbox</p>
            <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">Currency Crisis Lab</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              金利差や外貨準備の動きが通貨をどう揺らすか、シンプルなモデルで体感できるリアルタイムラボです。
            </p>
          </div>
          <div className="rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-100">
            α / React + Tailwind
          </div>
        </header>
        <CurrencyCrisisLab />
      </div>
    </div>
  );
}

export default App;
