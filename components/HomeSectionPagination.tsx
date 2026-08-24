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

  wrapper.querySelector(":scope > .r2f-section-pagination")?.remove();

  if (visibleCount >= cards.length) return;

  const controls = document.createElement("div");
  controls.className = `r2f-section-pagination r2f-section-load-controls ${styles.loadControls}`;
  controls.setAttribute("aria-label", `โหลดรายการเพิ่มในหมวด${title}`);

  const button = document.createElement("button");
  button.type = "button";
  button.className = styles.loadMore;
  button.innerHTML = `<span>โหลดเพิ่ม</span><span class="${styles.loadIcon}" aria-hidden="true">↓</span>`;
  button.setAttribute("aria-label", `โหลดรายการเพิ่มในหมวด${title}`);
  button.addEventListener("click", () => {
    const currentVisible = Number(wrapper.dataset.r2fVisibleCount || String(batchSize));
    wrapper.dataset.r2fVisibleCount = String(Math.min(cards.length, currentVisible + batchSize));
    renderSection(wrapper, title, SECTION_LINKS[title]);
  });

  controls.appendChild(button);
  wrapper.appendChild(controls);
}

function renderMobileDots(
  wrapper: HTMLElement,
  cards: HTMLElement[],
  perPage: number,
  title: string,
  href: string,
) {
  const pageCount = Math.max(1, Math.ceil(cards.length / perPage));
  const requestedPage = Number(wrapper.dataset.r2fPage || "0");
  const page = Math.min(Math.max(0, requestedPage), pageCount - 1);
  wrapper.dataset.r2fPage = String(page);

  cards.forEach((card, index) => {
    const visible = index >= page * perPage && index < (page + 1) * perPage;
    card.style.display = visible ? "" : "none";
  });

  let controls = wrapper.querySelector(":scope > .r2f-section-pagination") as HTMLElement | null;
  if (!controls || controls.classList.contains("r2f-section-load-controls")) {
    controls?.remove();
    controls = document.createElement("div");
    controls.className = "r2f-section-pagination";
    controls.setAttribute("aria-label", `เปลี่ยนหน้าหมวด${title}`);
    wrapper.appendChild(controls);
  }

  let dots = controls.querySelector(":scope > .r2f-section-dots") as HTMLElement | null;
  if (!dots) {
    dots = document.createElement("div");
    dots.className = "r2f-section-dots";
    dots.setAttribute("role", "group");
    controls.appendChild(dots);
  }

  if (Number(dots.dataset.pageCount || "0") !== pageCount) {
    dots.replaceChildren();
    dots.dataset.pageCount = String(pageCount);

    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "r2f-section-dot";
      dot.dataset.page = String(index);
      dot.setAttribute("aria-label", `${title} หน้าที่ ${index + 1}`);
      dot.addEventListener("click", () => {
        wrapper.dataset.r2fPage = String(index);
        renderSection(wrapper, title, href);
      });
      dots.appendChild(dot);
    }
  }

  Array.from(dots.children).forEach((dot, index) => {
    const button = dot as HTMLButtonElement;
    const active = index === page;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function renderSection(wrapper: HTMLElement, title: string, href: string) {
  const heading = wrapper.firstElementChild as HTMLElement | null;
  const grid = heading?.nextElementSibling as HTMLElement | null;
  if (!heading || !grid) return;

  ensureViewAll(heading, title, href);

  const cards = Array.from(grid.children) as HTMLElement[];
  if (!cards.length) return;

  const batchSize = Math.max(1, getColumnCount(grid) * 2);
  const desktop = window.matchMedia(DESKTOP_QUERY).matches;

  if (desktop) {
    renderDesktopLoadMore(wrapper, cards, batchSize, title);
    return;
  }

  renderMobileDots(wrapper, cards, batchSize, title, href);
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
