(() => {
  "use strict";

  const root = document.documentElement;
  const dictionary = window.translations?.en ?? {};
  const textNodes = [...document.querySelectorAll("[data-i18n]")];
  const ariaNodes = [...document.querySelectorAll("[data-i18n-aria]")];
  const ruText = new Map(textNodes.map((node) => [node.dataset.i18n, node.textContent.trim()]));
  const ruAria = new Map(ariaNodes.map((node) => [node.dataset.i18nAria, node.getAttribute("aria-label")]));
  const initialMeta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content ?? ""
  };

  const themeToggle = document.querySelector("#theme-toggle");
  const languageToggle = document.querySelector("#language-toggle");
  const menuToggle = document.querySelector("#menu-toggle");
  const mobileNav = document.querySelector("#mobile-nav");
  const languageStatus = document.querySelector("#language-status");
  const header = document.querySelector(".site-header");
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  const getSavedLanguage = () => {
    const saved = localStorage.getItem("portfolio-language");
    if (saved === "ru" || saved === "en") return saved;
    return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
  };

  let language = getSavedLanguage();

  function updateMenuLabel() {
    const isOpen = menuToggle?.getAttribute("aria-expanded") === "true";
    const key = isOpen ? "menuClose" : "menuOpen";
    const label = language === "en" ? dictionary[key] : (ruAria.get("menuOpen") || "Открыть меню");
    if (menuToggle) {
      menuToggle.setAttribute("aria-label", language === "ru" && isOpen ? "Закрыть меню" : label);
    }
  }

  function applyLanguage(nextLanguage, announce = false) {
    language = nextLanguage;
    root.lang = language;

    textNodes.forEach((node) => {
      const key = node.dataset.i18n;
      const value = language === "en" ? dictionary[key] : ruText.get(key);
      if (value) node.textContent = value;
    });

    ariaNodes.forEach((node) => {
      const key = node.dataset.i18nAria;
      const value = language === "en" ? dictionary[key] : ruAria.get(key);
      if (value) node.setAttribute("aria-label", value);
    });

    if (language === "en") {
      document.title = dictionary.metaTitle;
      if (metaDescription) metaDescription.content = dictionary.metaDescription;
      if (ogTitle) ogTitle.content = dictionary.metaTitle;
      if (ogDescription) ogDescription.content = dictionary.metaDescription;
      if (languageToggle) {
        languageToggle.textContent = "RU";
        languageToggle.setAttribute("aria-label", dictionary.languageToggle);
      }
    } else {
      document.title = initialMeta.title;
      if (metaDescription) metaDescription.content = initialMeta.description;
      if (ogTitle) ogTitle.content = initialMeta.title;
      if (ogDescription) ogDescription.content = initialMeta.description;
      if (languageToggle) {
        languageToggle.textContent = "EN";
        languageToggle.setAttribute("aria-label", "Switch to English");
      }
    }

    localStorage.setItem("portfolio-language", language);
    updateMenuLabel();

    if (announce && languageStatus) {
      languageStatus.textContent = language === "en" ? dictionary.languageChanged : "Язык изменён на русский";
    }
  }

  function updateThemeUi() {
    const isDark = root.dataset.theme === "dark";
    if (themeColor) themeColor.content = isDark ? "#090c11" : "#f4f6f8";
    const sun = themeToggle?.querySelector(".theme-icon-sun");
    const moon = themeToggle?.querySelector(".theme-icon-moon");
    if (sun) sun.hidden = !isDark;
    if (moon) moon.hidden = isDark;
  }

  function closeMenu({ restoreFocus = false } = {}) {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
    document.body.classList.remove("menu-open");
    updateMenuLabel();
    if (restoreFocus) menuToggle.focus();
  }

  function openMenu() {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute("aria-expanded", "true");
    mobileNav.hidden = false;
    document.body.classList.add("menu-open");
    updateMenuLabel();
    mobileNav.querySelector("a")?.focus();
  }

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("portfolio-theme", next);
    updateThemeUi();
  });

  languageToggle?.addEventListener("click", () => {
    applyLanguage(language === "ru" ? "en" : "ru", true);
  });

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu();
    else openMenu();
  });

  mobileNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
      closeMenu({ restoreFocus: true });
    }
  });

  const desktopQuery = matchMedia("(min-width: 920px)");
  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });

  const navLinks = [...document.querySelectorAll(".desktop-nav [data-section]")];
  const sections = navLinks
    .map((link) => document.querySelector(`#${link.dataset.section}`))
    .filter(Boolean);

  function setActiveSection(sectionId) {
    navLinks.forEach((link) => {
      const active = link.dataset.section === sectionId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function updateActiveNavigation() {
    if (!sections.length) return;

    const atPageEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 8;
    if (atPageEnd) {
      setActiveSection(sections.at(-1).id);
      return;
    }

    const marker = scrollY + Math.min(innerHeight * 0.38, 340);
    let currentSection = sections[0];
    for (const section of sections) {
      if (section.offsetTop <= marker) currentSection = section;
      else break;
    }
    setActiveSection(currentSection.id);
  }

  const revealGroups = [
    { selector: ".hero-main, .availability-card, .proof-grid", stagger: 90, variant: "hero" },
    { selector: ".section-heading", stagger: 0, variant: "heading" },
    { selector: ".case-card", stagger: 100, variant: "case" },
    { selector: ".system-flow-card", stagger: 0, variant: "flow" },
    { selector: ".approach-grid article", stagger: 75, variant: "approach" },
    { selector: ".timeline > article", stagger: 100, variant: "timeline" },
    { selector: ".expertise-grid > article", stagger: 85, variant: "expertise" },
    { selector: ".about-grid > *", stagger: 90, variant: "about" },
    { selector: ".contact > div", stagger: 0, variant: "contact-copy" },
    { selector: ".contact nav > a", stagger: 70, variant: "contact-action" }
  ];
  const revealElements = [];

  revealGroups.forEach(({ selector, stagger, variant }) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.classList.add("reveal", `reveal-${variant}`);
      element.style.setProperty("--reveal-delay", `${Math.min(index, 4) * stagger}ms`);
      revealElements.push(element);
    });
  });

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  let scrollFrame = 0;
  const updateScrollUi = () => {
    header?.classList.toggle("is-scrolled", scrollY > 8);
    updateActiveNavigation();
    scrollFrame = 0;
  };
  const requestScrollUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateScrollUi);
  };

  addEventListener("scroll", requestScrollUpdate, { passive: true });
  addEventListener("resize", requestScrollUpdate, { passive: true });

  applyLanguage(language);
  updateThemeUi();
  updateScrollUi();
})();
