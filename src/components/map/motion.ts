"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Typewriter name change (from the design prototype): erase the old name back
 * to the common prefix at 20ms/char, pause 120ms, type the new name at
 * 40ms/char (60ms on spaces), keep the caret until 320ms after done.
 */
export function useTypewriter(target: string): { text: string; caret: boolean } {
  const [text, setText] = useState(target);
  const [caret, setCaret] = useState(false);
  const textRef = useRef(target);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    const from = textRef.current;
    const to = target;
    if (from === to) return;
    let keep = 0;
    while (keep < from.length && keep < to.length && from[keep] === to[keep]) keep++;
    let cur = from;
    let phase: "erase" | "type" = "erase";
    const set = (t: string, c: boolean) => {
      textRef.current = t;
      setText(t);
      setCaret(c);
    };
    const step = () => {
      if (phase === "erase") {
        if (cur.length > keep) {
          cur = cur.slice(0, -1);
          set(cur, true);
          timer.current = setTimeout(step, 20);
        } else {
          phase = "type";
          timer.current = setTimeout(step, 120);
        }
      } else if (cur.length < to.length) {
        cur = to.slice(0, cur.length + 1);
        set(cur, true);
        const ch = to[cur.length - 1];
        timer.current = setTimeout(step, ch === " " ? 60 : 40);
      } else {
        timer.current = setTimeout(() => set(cur, false), 320);
      }
    };
    set(cur, true);
    timer.current = setTimeout(step, 120);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [target]);

  return { text, caret };
}

/** Measures an element's offsetHeight with a ResizeObserver. */
export function useMeasuredHeight<T extends HTMLElement>(): [
  (el: T | null) => void,
  number | null,
] {
  const [h, setH] = useState<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!el) return;
    setH(el.offsetHeight);
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    roRef.current = ro;
  }, []);
  return [ref, h];
}

/**
 * Tweens a list of numbers toward their targets over 700ms (cubic ease-out),
 * re-rendering each animation frame while any value is mid-flight.
 */
export function useTweenNumbers(targets: number[]): number[] {
  const [vals, setVals] = useState<number[]>(targets);
  const cur = useRef<number[]>(targets);
  const from = useRef<number[]>(targets);
  const to = useRef<number[]>(targets);
  const t0 = useRef<number[]>(targets.map(() => 0));
  const raf = useRef<number | null>(null);

  const key = targets.join("|");
  useEffect(() => {
    const now = performance.now();
    let changed = false;
    targets.forEach((v, i) => {
      if (to.current[i] !== v || cur.current[i] === undefined) {
        from.current[i] = cur.current[i] ?? v;
        to.current[i] = v;
        t0.current[i] = now;
        changed = true;
      }
    });
    if (!changed || raf.current) return;
    const step = () => {
      const t = performance.now();
      let live = false;
      const next = to.current.map((v, i) => {
        const p = Math.min(1, (t - t0.current[i]!) / 700);
        const e = 1 - Math.pow(1 - p, 3);
        if (p < 1) live = true;
        return from.current[i]! + (v - from.current[i]!) * e;
      });
      cur.current = next;
      raf.current = live ? requestAnimationFrame(step) : null;
      setVals(next);
    };
    raf.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return targets.map((v, i) => vals[i] ?? v);
}

/** Returns the transformed ancestor's box so `position: fixed` can be corrected. */
export function fixedOffset(el: HTMLElement): { left: number; top: number } {
  let cb = el.parentElement;
  while (cb && cb !== document.body) {
    if (getComputedStyle(cb).transform !== "none") {
      const r = cb.getBoundingClientRect();
      return { left: r.left, top: r.top };
    }
    cb = cb.parentElement;
  }
  return { left: 0, top: 0 };
}
