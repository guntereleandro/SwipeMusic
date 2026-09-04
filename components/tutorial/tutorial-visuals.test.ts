import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tutorial = readFileSync(resolve(process.cwd(), "components/tutorial/music-tutorial.tsx"), "utf8");
const card = readFileSync(resolve(process.cwd(), "components/tutorial/tutorial-card.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("didática visual do tutorial", () => {
  it("mostra pistas direcionais e deslocamentos curtos que retornam ao centro", () => {
    expect(card).toContain("tutorial-swipe-cue");
    expect(card).toContain("Gosto");
    expect(card).toContain("Não gosto");
    expect(css).toContain("translateX(min(55px, 14%))");
    expect(css).toContain("translateX(max(-55px, -14%))");
    expect(css).toMatch(/0%, 67%, 100% \{ transform: translateX\(0\)/);
  });

  it("direciona e pulsa os controles corretos", () => {
    expect(tutorial).toContain("Toque em Indiferente");
    expect(tutorial).toContain("Toque aqui para voltar");
    expect(css).toContain("tutorial-actions--neutral button:nth-child(2)");
    expect(css).toContain("tutorial-undo-highlight");
  });

  it("exibe feedback curto antes de avançar sem avaliação automática", () => {
    expect(tutorial).toContain("setTimeout(() => { dispatch");
    expect(tutorial).toContain("}, 550)");
    expect(tutorial).toContain("aria-live=\"polite\"");
    expect(css).toMatch(/animation:\s*tutorial-demo-(right|left)[^;]*infinite/);
    expect(card).toContain("onPointerDownCapture={stopDemo}");
    expect(card).toContain("onTouchStartCapture={stopDemo}");
    expect(card).toContain('style.animation = "none"');
    expect(card).toContain("tutorial-demo-feedback");
  });

  it("remove movimento e pulsos com preferência de movimento reduzido", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*tutorial-demo-motion--right[\s\S]*animation: none/);
  });
});
