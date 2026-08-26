"use client";

import { useEffect } from "react";
import styles from "./HomeSectionPagination.module.css";

const SECTION_LINKS: Record<string, string> = {
  "มาใหม่": "/new",
  "ซีรีส์": "/series",
  "ซีรีส์แนวตั้ง": "/vertical-series",
  "หนังไทย": "/thai-movies",
};

const DESKTOP_QUERY = "(min-width: 821px)";
const SWIPE_HINT_CLASS = "r2f-mobile-swipe-hint";

function getColumnCount(grid: HTMLElement) {
  const template = window.getComputedStyle(grid).gridTemplateColumns.trim();
  if (!template || template === "none") return 1;
  return Math.max(1, template.split(/\s+/).filter(Boolean).length);
}

function ensureViewAll(heading: HTMLElement, title: string, href: string) {
  if (heading.querySelector(":scope > .r2f-section-view-all")) return;

  const viewAll = document.createElement("a");
  viewAll.className = "r2f-section-view-all";
  viewAll.href = href;
  viewAll.textContent = "ดูทั้งหมด";
  viewAll.setAttribute("aria-label", `ดูทั้งหมดในหมวด${title}`);
  heading.appendChild(viewAll);
}

function renderDesktopLoadMore(
  wrapper: HTMLElement,
  cards: HTMLElement[],
  batchSize: number,
  title: string,
) {
  const requestedVisible = Number(wrapper.dataset.r2fVisibleCount || String(batchSize));
  const visibleCount = Math.min(cards.length, Math.max(batchSize, requestedVisible));
  wrapper.dataset.r2fVisibleCount = String(visibleCount);

  cards.forEach((card, index) => {
    card.style.display = index < visibleCount ? "" : "none";
  });

  let controls = wrapper.querySelector(":scope > .r2f-section-pagination") as HTMLElement | null;
  if (controls && !controls.classList.contains("r2f-section-load-controls")) {
    controls.remove();
    controls = null;
  }

  if (visibleCount >= cards.length) {
    controls?.remove();
    return;
  }

  if (controls) return;

  controls = document.createElement("div");
  controls.className = `r2f-section-pagination r2f-section-load-controls ${styles.loadControls}`;
  controls.setAttribute("aria-label", `โหลดรายการเพิ่มในหมวด${title}`);

  const button = document.createElement("button");
  button.type = "button";
  button.className = styles.loadMore;
  button.innerHTML = `<span>โหลดเพิ่ม</span><span class="${styles.loadIcon}" aria-hidden="true">↓</span>`;
  button.setAttribute("aria-label", `โหลดรายการเพิ่มในหมวด${title}`);
  button.addEventListener("click", () => {
    const currentVisible = Number(wrapper.dataset.r2fVisibleCount || String(batchSize));
    wrapper.dataset.r2fVisibleCount = String(currentVisible + batchSize);
    renderSection(wrapper, title, SECTION_LINKS[title]);
  });

  controls.appendChild(button);
  wrapper.appendChild(controls);
}

function ensureSwipeHint(heading: HTMLElement) {
  let hint = heading.querySelector(`:scope > .${SWIPE_HINT_CLASS}`) as HTMLElement | null;
  if (hint) return hint;

  hint = document.createElement("span");
  hint.className = `${SWIPE_HINT_CLASS} ${styles.swipeHint}`;
  hint.setAttribute("aria-hidden", "true");

  const track = document.createElement("span");
  track.className = styles.swipeTrack;
  track.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = styles.swipeLabel;
  label.textContent = "ปัดดูต่อ";

  const arrow = document.createElement("span");
  arrow.className = styles.swipeArrow;
  arrow.textContent = "›";
  arrow.setAttribute("aria-hidden", "true");

  hint.append(track, label, arrow);

  const viewAll = heading.querySelector(":scope > .r2f-section-view-all");
  if (viewAll) heading.insertBefore(hint, viewAll);
  else heading.appendChild(hint);

  return hint;
}

function syncMobileRailState(wrapper: HTMLElement, heading: HTMLElement, grid: HTMLElement) {
  const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
  const atEnd = maxScroll <= 4 || grid.scrollLeft >= maxScroll - 8;
  wrapper.classList.toggle(styles.railAtEnd, atEnd);

  if (grid.scrollLeft > 12 && wrapper.dataset.r2fSwipeSeen !== "1") {
    wrapper.dataset.r2fSwipeSeen = "1";
    heading
      .querySelector(`:scope > .${SWIPE_HINT_CLASS}`)
      ?.classList.add(styles.swipeHintSeen);
  }
}

function bindMobileRail(wrapper: HTMLElement, heading: HTMLElement, grid: HTMLElement) {
  if (grid.dataset.r2fSwipeBound === "1") return;
  grid.dataset.r2fSwipeBound = "1";

  grid.addEventListener(
    "scroll",
    () => syncMobileRailState(wrapper, heading, grid),
    { passive: true },
  );
}

function renderMobileCarousel(
  wrapper: HTMLElement,
  heading: HTMLElement,
  grid: HTMLElement,
  cards: HTMLElement[],
  title: string,
) {
  wrapper.querySelector(":scope > .r2f-section-pagination")?.remove();
  delete wrapper.dataset.r2fPage;

  cards.forEach((card) => {
    card.style.display = "";
  });

  wrapper.classList.add(styles.mobileSection);
  heading.classList.add(styles.mobileHeading);
  grid.classList.add(styles.mobileRail);
  grid.setAttribute("role", "region");
  grid.setAttribute("aria-label", `${title} ปัดซ้ายขวาเพื่อดูรายการเพิ่มเติม`);

  const hint = ensureSwipeHint(heading);
  if (wrapper.dataset.r2fSwipeSeen === "1") hint.classList.add(styles.swipeHintSeen);
  else hint.classList.remove(styles.swipeHintSeen);

  bindMobileRail(wrapper, heading, grid);
  window.requestAnimationFrame(() => syncMobileRailState(wrapper, heading, grid));
}

function cleanupMobileCarousel(wrapper: HTMLElement, heading: HTMLElement, grid: HTMLElement) {
  wrapper.classList.remove(styles.mobileSection, styles.railAtEnd);
  heading.classList.remove(styles.mobileHeading);
  grid.classList.remove(styles.mobileRail);
  grid.removeAttribute("role");
  grid.removeAttribute("aria-label");
  heading.querySelector(`:scope > .${SWIPE_HINT_CLASS}`)?.remove();
  delete wrapper.dataset.r2fSwipeSeen;
  if (grid.scrollLeft) grid.scrollLeft = 0;
}

function renderSection(wrapper: HTMLElement, title: string, href: string) {
  const heading = wrapper.firstElementChild as HTMLElement | null;
  const grid = heading?.nextElementSibling as HTMLElement | null;
  if (!heading || !grid) return;

  ensureViewAll(heading, title, href);

  const cards = Array.from(grid.children) as HTMLElement[];
  if (!cards.length) return;

  const desktop = window.matchMedia(DESKTOP_QUERY).matches;

  if (!desktop) {
    renderMobileCarousel(wrapper, heading, grid, cards, title);
    return;
  }

  cleanupMobileCarousel(wrapper, heading, grid);

  if (wrapper.dataset.r2fRealPagination === "1") {
    wrapper.querySelector(":scope > .r2f-section-pagination")?.remove();
    delete wrapper.dataset.r2fVisibleCount;
    cards.forEach((card) => {
      card.style.display = "";
    });
    return;
  }

  const batchSize = Math.max(1, getColumnCount(grid) * 2);
  renderDesktopLoadMore(wrapper, cards, batchSize, title);
}

function enhanceHomeSections() {
  const catalog = document.getElementById("catalog");
  if (!catalog) return;

  Array.from(catalog.children).forEach((node) => {
    const wrapper = node as HTMLElement;
    const heading = wrapper.firstElementChild as HTMLElement | null;
    const title = heading?.querySelector("strong")?.textContent?.trim() || "";
    const href = SECTION_LINKS[title];
    if (!href) return;
    renderSection(wrapper, title, href);
  });
}

export default function HomeSectionPagination() {
  useEffect(() => {
    let resizeTimer = 0;
    let frame = 0;

    const scheduleEnhance = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(enhanceHomeSections);
    };

    scheduleEnhance();

    const observer = new MutationObserver((mutations) => {
      const meaningful = mutations.some((mutation) => {
        const target = mutation.target as Element;
        return !target.closest?.(".r2f-section-pagination");
      });
      if (meaningful) scheduleEnhance();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scheduleEnhance, 120);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
