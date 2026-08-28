"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Rating } from "@/types/song";

type SwipeRating = Extract<Rating, "LIKE" | "DISLIKE">;

type UseSwipeGestureOptions = {
  disabled?: boolean;
  onSwipe: (rating: SwipeRating) => Promise<boolean>;
};

export const SWIPE_DEBUG = false;

export type SwipeDebugState = {
  event: string;
  deltaX: number;
  deltaY: number;
  pointerType: string;
  hasPointerCapture: boolean;
  dragging: boolean;
};

const EXIT_DURATION_MS = 240;
const SWIPE_IGNORE_SELECTOR =
  '[data-swipe-ignore="true"], button, input, audio, a, select, textarea, [role="button"]';
const INTENT_DISTANCE_PX = 12;
const DIRECTION_BIAS = 1.2;

export function useSwipeGesture({ disabled = false, onSwipe }: UseSwipeGestureOptions) {
  const activePointerId = useRef<number | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const pointerIntent = useRef<"PENDING" | "HORIZONTAL" | "VERTICAL">("PENDING");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetXRef = useRef(0);
  const cardWidthRef = useRef(1);
  const isExitingRef = useRef(false);
  const onSwipeRef = useRef(onSwipe);
  const disabledRef = useRef(disabled);
  const [cardElement, setCardElement] = useState<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [debug, setDebug] = useState<SwipeDebugState>({
    event: "waiting",
    deltaX: 0,
    deltaY: 0,
    pointerType: "—",
    hasPointerCapture: false,
    dragging: false,
  });

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!cardElement) return;

    const updateWidth = () => {
      const width = cardElement.offsetWidth || 1;
      cardWidthRef.current = width;
      setCardWidth(width);
    };
    const observer = new ResizeObserver(updateWidth);

    updateWidth();
    observer.observe(cardElement);
    return () => observer.disconnect();
  }, [cardElement]);

  const updateDrag = useCallback((deltaX: number) => {
    offsetXRef.current = deltaX;
    setOffsetX(deltaX);
  }, []);

  const cancelSwipe = useCallback(() => {
    activePointerId.current = null;
    pointerIntent.current = "PENDING";
    setIsDragging(false);
    updateDrag(0);
  }, [updateDrag]);

  const finishSwipe = useCallback(
    (deltaX: number) => {
      if (isExitingRef.current) return;

      const width = cardWidthRef.current;
      const threshold = Math.min(100, width * 0.25);

      setIsDragging(false);

      if (Math.abs(deltaX) < threshold) {
        updateDrag(0);
        return;
      }

      const direction = deltaX > 0 ? 1 : -1;
      const rating: SwipeRating = direction > 0 ? "LIKE" : "DISLIKE";
      const exitDistance = window.innerWidth + width;

      isExitingRef.current = true;
      setIsExiting(true);
      updateDrag(direction * exitDistance);
      exitTimer.current = setTimeout(async () => {
        const saved = await onSwipeRef.current(rating);

        if (!saved) {
          isExitingRef.current = false;
          setIsExiting(false);
          updateDrag(0);
        }
      }, EXIT_DURATION_MS);
    },
    [updateDrag],
  );

  const updateTouchDebug = useCallback(
    (eventName: string, deltaX: number, deltaY: number, dragging: boolean) => {
      if (!SWIPE_DEBUG || process.env.NODE_ENV !== "development") return;

      setDebug({
        event: eventName,
        deltaX: Math.round(deltaX),
        deltaY: Math.round(deltaY),
        pointerType: "touch",
        hasPointerCapture: false,
        dragging,
      });
    },
    [],
  );

  useEffect(() => {
    if (!cardElement) return;

    let activeTouchId: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastDeltaX = 0;
    let lastDeltaY = 0;

    const findTouch = (touches: TouchList, identifier: number) => {
      for (let index = 0; index < touches.length; index += 1) {
        const touch = touches.item(index);
        if (touch?.identifier === identifier) return touch;
      }
      return null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (
        disabledRef.current ||
        isExitingRef.current ||
        activeTouchId !== null ||
        event.touches.length === 0 ||
        (event.target instanceof Element &&
          event.target.closest(SWIPE_IGNORE_SELECTOR))
      ) {
        return;
      }

      const touch = event.touches[0];
      activeTouchId = touch.identifier;
      startX = touch.clientX;
      startY = touch.clientY;
      lastDeltaX = 0;
      lastDeltaY = 0;
      setIsDragging(true);
      updateTouchDebug("touchstart", 0, 0, true);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (activeTouchId === null || isExitingRef.current) return;

      const touch = findTouch(event.touches, activeTouchId);
      if (!touch) return;

      event.preventDefault();
      lastDeltaX = touch.clientX - startX;
      lastDeltaY = touch.clientY - startY;
      updateDrag(lastDeltaX);
      updateTouchDebug("touchmove", lastDeltaX, lastDeltaY, true);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (activeTouchId === null || !findTouch(event.changedTouches, activeTouchId)) return;

      updateTouchDebug("touchend", lastDeltaX, lastDeltaY, false);
      activeTouchId = null;
      finishSwipe(lastDeltaX);
    };

    const handleTouchCancel = (event: TouchEvent) => {
      if (activeTouchId === null || !findTouch(event.changedTouches, activeTouchId)) return;

      updateTouchDebug("touchcancel", lastDeltaX, lastDeltaY, false);
      activeTouchId = null;
      cancelSwipe();
    };

    cardElement.addEventListener("touchstart", handleTouchStart);
    cardElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    cardElement.addEventListener("touchend", handleTouchEnd);
    cardElement.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      cardElement.removeEventListener("touchstart", handleTouchStart);
      cardElement.removeEventListener("touchmove", handleTouchMove);
      cardElement.removeEventListener("touchend", handleTouchEnd);
      cardElement.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [cancelSwipe, cardElement, finishSwipe, updateDrag, updateTouchDebug]);

  function updatePointerDebug(
    eventName: string,
    event: ReactPointerEvent<HTMLDivElement>,
    deltaX = 0,
    deltaY = 0,
    dragging = pointerIntent.current === "HORIZONTAL",
  ) {
    if (!SWIPE_DEBUG || process.env.NODE_ENV !== "development") return;

    setDebug({
      event: eventName,
      deltaX: Math.round(deltaX),
      deltaY: Math.round(deltaY),
      pointerType: event.pointerType,
      hasPointerCapture: event.currentTarget.hasPointerCapture(event.pointerId),
      dragging,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      disabledRef.current ||
      isExitingRef.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as Element).closest(SWIPE_IGNORE_SELECTOR)
    ) {
      return;
    }

    activePointerId.current = event.pointerId;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    pointerIntent.current = "PENDING";
    updatePointerDebug("pointerdown", event, 0, 0, false);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      activePointerId.current !== event.pointerId ||
      isExitingRef.current
    ) {
      return;
    }

    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;

    if (pointerIntent.current === "PENDING") {
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (
        horizontalDistance >= INTENT_DISTANCE_PX &&
        horizontalDistance > verticalDistance * DIRECTION_BIAS
      ) {
        pointerIntent.current = "HORIZONTAL";
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
      } else if (
        verticalDistance >= INTENT_DISTANCE_PX &&
        verticalDistance > horizontalDistance * DIRECTION_BIAS
      ) {
        pointerIntent.current = "VERTICAL";
        activePointerId.current = null;
        updatePointerDebug("pointermove: vertical", event, deltaX, deltaY, false);
        return;
      }
    }

    if (pointerIntent.current === "HORIZONTAL") {
      event.preventDefault();
      updateDrag(deltaX);
    }

    updatePointerDebug("pointermove", event, deltaX, deltaY);
  }

  function releasePointerCapture(element: HTMLDivElement, pointerId: number) {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      activePointerId.current !== event.pointerId ||
      isExitingRef.current
    ) {
      return;
    }

    const deltaX = offsetXRef.current;
    updatePointerDebug(
      "pointerup",
      event,
      deltaX,
      event.clientY - pointerStart.current.y,
    );
    activePointerId.current = null;
    pointerIntent.current = "PENDING";
    releasePointerCapture(event.currentTarget, event.pointerId);
    finishSwipe(deltaX);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || activePointerId.current !== event.pointerId) return;

    updatePointerDebug(
      "pointercancel",
      event,
      offsetXRef.current,
      event.clientY - pointerStart.current.y,
    );
    releasePointerCapture(event.currentTarget, event.pointerId);
    cancelSwipe();
  }

  const threshold = Math.min(100, cardWidth * 0.25);
  const feedbackStrength = Math.min(Math.abs(offsetX) / threshold, 1);
  const rotation = Math.max(-8, Math.min(8, (offsetX / cardWidth) * 8));

  return {
    setCardElement,
    debug,
    feedbackStrength,
    direction: offsetX === 0 ? null : offsetX > 0 ? ("RIGHT" as const) : ("LEFT" as const),
    isDragging,
    isExiting,
    style: {
      transform: `translate3d(${offsetX}px, 0, 0) rotate(${rotation}deg)`,
      transition: isDragging
        ? "none"
        : `transform ${EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      touchAction: "auto" as const,
    },
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (
          event.pointerType === "mouse" &&
          activePointerId.current === event.pointerId
        ) {
          updatePointerDebug(
            "lostpointercapture",
            event,
            offsetXRef.current,
            event.clientY - pointerStart.current.y,
          );
          cancelSwipe();
        }
      },
    },
  };
}
