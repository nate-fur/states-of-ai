"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "./use-mounted";

// The circled-i tooltip shared by the bill panel and the reader rail:
// fixed to the viewport (portalled past any transformed ancestor), 260px
// wide, anchored under the "i", clamped to the right edge. Content is the
// regulation area's description.

type Tip = { text: string; left: number; top: number };

export function useInfoTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [on, setOn] = useState(false);
  const mounted = useMounted();

  const show = useCallback((e: React.MouseEvent<HTMLElement>, text: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, left: Math.min(r.left, window.innerWidth - 276), top: r.bottom + 8 });
    setOn(true);
  }, []);
  const hide = useCallback(() => setOn(false), []);

  const node =
    mounted && tip
      ? createPortal(
          <span
            className="pointer-events-none fixed z-[60] w-[260px] bg-ink px-3 py-2.5 font-map-serif text-[14px] leading-[1.45] text-paper text-pretty"
            style={{
              left: tip.left,
              top: tip.top,
              opacity: on ? 1 : 0,
              transform: `translateY(${on ? 0 : -4}px)`,
              transition: "opacity .18s ease, transform .18s ease",
            }}
          >
            {tip.text}
          </span>,
          document.body,
        )
      : null;

  return { show, hide, node };
}

/** The 16px / 18px circled "i" that anchors the tooltip. */
export function InfoDot({
  size = 16,
  text,
  show,
  hide,
}: {
  size?: 16 | 18;
  text: string;
  show: (e: React.MouseEvent<HTMLElement>, text: string) => void;
  hide: () => void;
}) {
  return (
    <span
      onMouseEnter={(e) => show(e, text)}
      onMouseLeave={hide}
      className="flex shrink-0 cursor-help items-center justify-center rounded-full border border-dim font-map-mono font-normal normal-case tracking-normal text-mute hover:border-ink hover:text-ink"
      style={{ width: size, height: size, fontSize: size === 18 ? 11 : 10, lineHeight: 1 }}
    >
      i
    </span>
  );
}
