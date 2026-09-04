"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { UndoIcon } from "@/components/icons";
import { RatingActions } from "@/components/rating-actions";
import { TutorialCard } from "@/components/tutorial/tutorial-card";
import { INITIAL_TUTORIAL_STATE, tutorialReducer } from "@/lib/tutorial/tutorial-machine";
import type { Rating } from "@/types/song";

const DEMO = {
  LIKE: { title: "Sol de Domingo", artist: "Banda Horizonte", accent: "from-amber-700 to-orange-950" },
  DISLIKE: { title: "Noite Elétrica", artist: "Satélite Azul", accent: "from-indigo-700 to-slate-950" },
  NEUTRAL: { title: "Entre Caminhos", artist: "Clara Norte", accent: "from-emerald-800 to-zinc-950" },
} as const;

export function MusicTutorial({ libraryName, onSkip, onComplete }: { libraryName: string; onSkip: () => void; onComplete: () => void }) {
  const [state, dispatch] = useReducer(tutorialReducer, INITIAL_TUTORIAL_STATE);
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (state.step === "INTRO") return <TutorialShell libraryName={libraryName}><section className="my-auto rounded-[1.75rem] border border-white/10 bg-[#1c1c1f] p-8 text-center shadow-2xl">
    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-600 text-2xl font-black">S</span>
    <h2 className="mt-5 text-3xl font-bold">Bem-vindo!</h2><p className="mt-2 text-sm font-bold text-amber-300">Aprenda em menos de 30 segundos</p><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">Você vai testar Gosto, Não gosto, Indiferente e Desfazer antes de começar.</p>
    <div className="mt-7 grid gap-3"><button type="button" onClick={() => dispatch({ type: "START" })} className="min-h-12 rounded-xl bg-amber-600 px-5 py-3 font-bold text-white hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Começar tutorial</button>
      <button type="button" onClick={onSkip} className="min-h-12 rounded-xl px-5 py-3 text-sm font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400">Pular</button></div>
  </section></TutorialShell>;

  if (state.step === "COMPLETE") return <TutorialShell libraryName={libraryName}><section className="my-auto rounded-[1.75rem] border border-emerald-400/20 bg-[#1c1c1f] p-7 text-center shadow-2xl">
    <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300">✓</div><h2 className="mt-5 text-2xl font-bold">Pronto! Agora você já sabe avaliar.</h2>
    {state.restoredSongId && <p className="mt-3 rounded-xl bg-amber-400/[0.08] px-4 py-2 text-sm text-amber-200">“Entre Caminhos” foi recuperada com sucesso.</p>}
    <div className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-2 text-left text-sm"><span className="rounded-xl bg-white/[0.04] p-3 text-emerald-300">→ Gosto</span><span className="rounded-xl bg-white/[0.04] p-3 text-rose-300">← Não gosto</span><span className="rounded-xl bg-white/[0.04] p-3 text-zinc-300">• Indiferente</span><span className="rounded-xl bg-white/[0.04] p-3 text-amber-300">↶ Desfazer</span></div>
    <button type="button" onClick={onComplete} className="mt-7 min-h-12 w-full rounded-xl bg-amber-600 px-5 py-3 font-bold text-white hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Começar minhas músicas</button>
  </section></TutorialShell>;

  const demo = state.step === "UNDO" ? DEMO.NEUTRAL : DEMO[state.step];
  const instruction = state.step === "LIKE" ? "Gostou desta música? Arraste para a direita ou toque em Gosto." : state.step === "DISLIKE" ? "Não quer esta música? Arraste para a esquerda ou toque em Não gosto." : state.step === "NEUTRAL" ? "Não tem preferência? Toque em Indiferente." : "Mudou de ideia? Use Desfazer para recuperar sua última avaliação.";
  const expected = state.step === "LIKE" ? "LIKE" : state.step === "DISLIKE" ? "DISLIKE" : state.step === "NEUTRAL" ? "NEUTRAL" : null;
  const cue = state.step === "LIKE" ? "RIGHT" : state.step === "DISLIKE" ? "LEFT" : null;
  const feedbackByRating = { LIKE: "✓ Isso! Arrastar para a direita significa Gosto.", DISLIKE: "✓ Certo! Essa música será marcada como Não gosto.", NEUTRAL: "✓ Certo! Use quando você não tiver preferência." } as const;
  const rate = async (rating: Rating) => {
    if (rating !== expected || feedback) return false;
    setFeedback(feedbackByRating[rating]);
    timer.current = setTimeout(() => { dispatch({ type: "RATE", rating }); setFeedback(null); }, 550);
    return true;
  };
  const undo = () => {
    if (feedback) return;
    setFeedback("✓ Pronto! Sua última escolha foi desfeita.");
    timer.current = setTimeout(() => { dispatch({ type: "UNDO" }); setFeedback(null); }, 550);
  };

  return <TutorialShell libraryName={libraryName}><div className="flex flex-1 flex-col justify-center"><div className="mb-3 min-h-[4.75rem] px-2 text-center"><p className="text-xs font-bold uppercase tracking-widest text-amber-400">Tutorial · {state.step === "UNDO" ? "4" : state.step === "LIKE" ? "1" : state.step === "DISLIKE" ? "2" : "3"} de 4</p><p aria-live="polite" className={`mt-2 text-sm font-medium leading-6 ${feedback ? "text-emerald-300" : "text-zinc-300"}`}>{feedback ?? instruction}</p></div>
    <TutorialCard key={state.step} title={demo.title} artist={demo.artist} accent={demo.accent} cue={cue} muted={state.step === "UNDO"} disabled={state.step === "UNDO" || Boolean(feedback)} onSwipe={async (rating) => state.step !== "UNDO" && rate(rating)}>
      {state.step === "UNDO" ? <div className="relative pt-7"><div aria-hidden className="tutorial-control-arrow">↓ <span>Toque aqui para voltar</span></div><button type="button" disabled={Boolean(feedback)} onClick={undo} className="tutorial-undo-highlight flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 font-bold text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-70"><UndoIcon className="size-5" />Desfazer</button></div> : <div className={`relative pt-7 tutorial-actions tutorial-actions--${state.step.toLowerCase()}`}><div aria-hidden className="tutorial-control-arrow">↓ <span>{state.step === "NEUTRAL" ? "Toque em Indiferente" : "ou toque no botão"}</span></div><RatingActions disabled={Boolean(feedback)} onRate={rate} /></div>}
    </TutorialCard></div></TutorialShell>;
}

function TutorialShell({ libraryName, children }: { libraryName: string; children: React.ReactNode }) {
  return <main className="min-h-[100svh] overflow-x-hidden bg-[#111113] px-3 py-4 text-zinc-50 sm:px-6 sm:py-6"><div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[460px] flex-col sm:min-h-[calc(100svh-3rem)]"><header className="mb-4 flex items-center gap-2.5 px-1"><span className="grid size-8 place-items-center rounded-lg bg-amber-600 text-sm font-black">S</span><h1 className="text-[15px] font-bold">{libraryName}</h1></header>{children}</div></main>;
}
