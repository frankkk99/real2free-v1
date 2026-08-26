"use client";

import { useEffect } from "react";

const HOME_SECTION_SELECTOR = '[data-r2f-real-pagination="1"]';
const LOAD_MORE_LABEL = "แสดงเพิ่มเติม";

function findBottomHomeLoadMoreButton(): HTMLButtonElement | null {
  const sections = Array.from(document.querySelectorAll<HTMLElement>(HOME_SECTION_SELECTOR));
  const bottomSection = sections.at(-1);
  if (!bottomSection) return null;

  return Array.from(bottomSection.querySelectorAll<HTMLButtonElement>("button")).find((button) => (
    button.textContent?.replace(/\s+/g, " ").trim() === LOAD_MORE_LABEL
  )) || null;
}

export default function HomeBottomInfiniteLoader() {
  useEffect(() => {
    const catalog = document.getElementById("catalog");
    if (!catalog) return;

    let intersectionObserver: IntersectionObserver | null = null;
    let observedButton: HTMLButtonElement | null = null;
    let animationFrame = 0;

    const armObserver = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const nextButton = findBottomHomeLoadMoreButton();
        if (nextButton === observedButton) return;

        intersectionObserver?.disconnect();
        observedButton = nextButton;
        if (!nextButton) return;

        intersectionObserver = new IntersectionObserver(
          (entries) => {
            if (!entries[0]?.isIntersecting) return;
            const button = observedButton;
            if (!button || button.disabled) return;
            if (button.textContent?.replace(/\s+/g, " ").trim() !== LOAD_MORE_LABEL) return;

            // One observer firing equals one page request. MovieHomeV2 also keeps its
            // existing per-section loading lock, so rapid scroll/mutations cannot
            // create overlapping Supabase requests.
            intersectionObserver?.disconnect();
            button.click();
          },
          { rootMargin: "900px 0px" },
        );
        intersectionObserver.observe(nextButton);
      });
    };

    const mutationObserver = new MutationObserver(armObserver);
    mutationObserver.observe(catalog, { childList: true, subtree: true });
    armObserver();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mutationObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, []);

  return null;
}
