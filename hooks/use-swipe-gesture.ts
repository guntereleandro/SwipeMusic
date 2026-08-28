"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Rating } from "@/types/song";

type UseSwipeGestureOptions = {
  onSwipe: (rating: Extract<Rating, "LIKE" | "DISLIKE">) => void;
};

const EXIT_DURATION_MS = 240;
const INTERACTIVE_SELECTOR = "button, input, audio, [data-no-swipe]";
const INTENT_DISTANCE_PX = 12;
const DIRECTION_BIAS = 1.2;

export function useSwipeGesture({ onSwipe }: UseSwipeGestureOptions) {
  const activePointerId = useRef<number | null>(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const intent = useRef<"PENDING" | "HORIZONTAL" | "VERTICAL">("PENDING");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardElement, setCardElement] = useState<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!cardElement) return;

    const updateWidth = () => setCardWidth(cardElement.offsetWidth || 1);
    const observer = new ResizeObserver(updateWidth);

    updateWidth();
    observer.observe(cardElement);
    return () => observer.disconnect();
  }, [cardElement]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      isExiting ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as Element).closest(INTERACTIVE_SELECTOR)
    ) {
      return;
    }

    activePointerId.current = event.pointerId;
    startPoint.current = { x: event.clientX, y: event.clientY };
    intent.current = "PENDING";
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== event.pointerId || isExiting) return;

    const deltaX = event.clientX - startPoint.current.x;
    const deltaY = event.clientY - startPoint.current.y;

    if (intent.current === "PENDING") {
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (
        horizontalDistance >= INTENT_DISTANCE_PX &&
        horizontalDistance > verticalDistance * DIRECTION_BIAS
      ) {
        intent.current = "HORIZONTAL";
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
      } else if (
        verticalDistance >= INTENT_DISTANCE_PX &&
        verticalDistance > horizontalDistance * DIRECTION_BIAS
      ) {
        intent.current = "VERTICAL";
        activePointerId.current = null;
        return;
      }
    }

    if (intent.current === "HORIZONTAL") {
      event.preventDefault();
      setOffsetX(deltaX);
    }
  }

  function releasePointerCapture(element: HTMLDivElement, pointerId: number) {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  }

  function resetCard(event?: ReactPointerEvent<HTMLDivElement>) {
    const pointerId = activePointerId.current;
    activePointerId.current = null;
    intent.current = "PENDING";
    setIsDragging(false);
    setOffsetX(0);

    if (event && pointerId !== null) {
      releasePointerCapture(event.currentTarget, pointerId);
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== event.pointerId || isExiting) return;

    const threshold = Math.min(100, cardWidth * 0.25);
    const completedSwipe = intent.current === "HORIZONTAL" && Math.abs(offsetX) >= threshold;

    activePointerId.current = null;
    intent.current = "PENDING";
    setIsDragging(false);
    releasePointerCapture(event.currentTarget, event.pointerId);

    if (!completedSwipe) {
      setOffsetX(0);
      return;
    }

    const direction = offsetX > 0 ? 1 : -1;
    const rating = direction > 0 ? "LIKE" : "DISLIKE";
    const exitDistance = window.innerWidth + cardWidth;

    setIsExiting(true);
    setOffsetX(direction * exitDistance);
    exitTimer.current = setTimeout(() => onSwipe(rating), EXIT_DURATION_MS);
  }

  const threshold = Math.min(100, cardWidth * 0.25);
  const feedbackStrength = Math.min(Math.abs(offsetX) / threshold, 1);
  const rotation = Math.max(-8, Math.min(8, (offsetX / cardWidth) * 8));

  return {
    setCardElement,
    offsetX,
    feedbackStrength,
    direction: offsetX === 0 ? null : offsetX > 0 ? ("RIGHT" as const) : ("LEFT" as const),
    isDragging,
    isExiting,
    style: {
      transform: `translate3d(${offsetX}px, 0, 0) rotate(${rotation}deg)`,
      transition: isDragging ? "none" : `transform ${EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      touchAction: "pan-y" as const,
    },
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: resetCard,
      onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current === event.pointerId) resetCard();
      },
    },
  };
}
