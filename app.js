/* =========================================================
   Alchemane — landing page behaviour
   Vanilla JS, progressive enhancement. Nothing here is
   required for content to be visible.
   ========================================================= */

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersReducedMotion = () => reducedMotionQuery.matches;
const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');

/* ---------------- Carousels ---------------- */

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('[data-track]');
  const previous = carousel.querySelector('[data-previous]');
  const next = carousel.querySelector('[data-next]');
  const progress = carousel.querySelector('[data-carousel-dots]');
  const status = carousel.querySelector('[data-carousel-status]');
  if (!track) return;

  const items = [...track.children];
  const count = items.length;
  let current = 0;

  items.forEach((item, index) => {
    item.setAttribute('role', 'group');
    item.setAttribute('aria-roledescription', 'slide');
    item.setAttribute('aria-label', `${index + 1} of ${count}`);
  });

  const itemOffset = (index) => {
    const item = items[index];
    if (!item) return 0;
    const padding = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return item.offsetLeft - padding;
  };

  const goTo = (index) => {
    const target = Math.max(0, Math.min(count - 1, index));
    track.scrollTo({ left: itemOffset(target), behavior: scrollBehavior() });
  };

  // Direct navigation: one thin segment per item (44px tall targets)
  const segments = [];
  if (progress) {
    items.forEach((_, index) => {
      const segment = document.createElement('button');
      segment.type = 'button';
      segment.setAttribute('aria-label', `Go to item ${index + 1} of ${count}`);
      segment.setAttribute('aria-current', 'false');
      segment.addEventListener('click', () => goTo(index));
      progress.append(segment);
      segments.push(segment);
    });
  }

  const isGridMode = () => getComputedStyle(track).display === 'grid';

  // Trailing spacer so the last item can snap to the start position
  const sizeTail = () => {
    if (isGridMode()) { track.style.removeProperty('--tail'); return; }
    const styles = getComputedStyle(track);
    const padding = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
    const gap = Number.parseFloat(styles.columnGap) || 0;
    const last = items[count - 1];
    const tail = Math.max(0, track.clientWidth - padding - gap - (last ? last.offsetWidth : 0));
    track.style.setProperty('--tail', `${Math.round(tail)}px`);
  };

  const updateState = () => {
    if (isGridMode()) return;
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    const left = track.scrollLeft;

    // Nearest item to the current scroll position
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    items.forEach((_, index) => {
      const distance = Math.abs(itemOffset(index) - left);
      if (distance < nearestDistance) { nearestDistance = distance; nearest = index; }
    });
    if (left >= maximum - 2) nearest = count - 1;
    current = nearest;

    if (previous) previous.disabled = left <= 2;
    if (next) next.disabled = left >= maximum - 2;
    segments.forEach((segment, index) => {
      segment.setAttribute('aria-current', String(index === current));
    });
    if (status) status.textContent = `${current + 1} / ${count}`;
  };

  if (previous) previous.addEventListener('click', () => goTo(current - 1));
  if (next) next.addEventListener('click', () => goTo(current + 1));

  // Keyboard: arrow keys anywhere inside the carousel move between items
  carousel.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('video')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1); }
    else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
    else if (event.key === 'End') { event.preventDefault(); goTo(count - 1); }
  });

  // Keep the focused item in view when tabbing through play buttons
  track.addEventListener('focusin', (event) => {
    const item = items.find((candidate) => candidate.contains(event.target));
    if (item && !isGridMode()) goTo(items.indexOf(item));
  });

  let raf = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateState);
  }, { passive: true });
  const relayout = () => { sizeTail(); updateState(); };
  window.addEventListener('resize', relayout);
  relayout();
});

/* ---------------- FAQ tabs ---------------- */

document.querySelectorAll('[data-faq]').forEach((faq) => {
  const tabs = [...faq.querySelectorAll('[role="tab"]')];
  const panels = [...faq.querySelectorAll('[role="tabpanel"]')];

  const activate = (tab, focus = false) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== tab.dataset.tab;
    });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      let target = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = tabs[(index + 1) % tabs.length];
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (event.key === 'Home') target = tabs[0];
      else if (event.key === 'End') target = tabs[tabs.length - 1];
      if (target) { event.preventDefault(); activate(target, true); }
    });
  });
});

/* Close sibling FAQ items within the same panel for a tidy accordion */
document.querySelectorAll('.faq-panel').forEach((panel) => {
  const items = [...panel.querySelectorAll('.faq-item')];
  items.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      items.forEach((other) => { if (other !== item) other.open = false; });
    });
  });
});

/* ---------------- Videos: single-player policy ---------------- */

const allVideos = [...document.querySelectorAll('video')];
const heroVideo = document.querySelector('.hero__video video');

const pauseOthers = (active) => {
  allVideos.forEach((video) => {
    if (video !== active && !video.paused) video.pause();
  });
};

document.querySelectorAll('.play-button').forEach((button) => {
  const card = button.closest('[data-video-card]');
  const video = card?.querySelector('video');
  if (!(card && video instanceof HTMLVideoElement)) return;

  const baseLabel = video.getAttribute('aria-label') || 'video';

  const sync = () => {
    const playing = !video.paused && !video.ended;
    card.classList.toggle('is-playing', playing);
    video.controls = playing || video.currentTime > 0;
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${baseLabel}`);
  };

  button.addEventListener('click', () => {
    if (video.paused || video.ended) {
      pauseOthers(video);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  video.addEventListener('play', () => { pauseOthers(video); sync(); });
  video.addEventListener('pause', sync);
  video.addEventListener('ended', sync);
  sync();
});

/* Hero video: user control for auto-playing motion + pause when a story video starts */
const heroToggle = document.querySelector('[data-hero-toggle]');
if (heroVideo instanceof HTMLVideoElement && heroToggle) {
  const syncHero = () => {
    const paused = heroVideo.paused;
    heroToggle.setAttribute('aria-pressed', String(paused));
    heroToggle.setAttribute('aria-label', paused ? 'Play hero video' : 'Pause hero video');
  };
  heroToggle.addEventListener('click', () => {
    if (heroVideo.paused) heroVideo.play().catch(() => {});
    else heroVideo.pause();
  });
  heroVideo.addEventListener('play', syncHero);
  heroVideo.addEventListener('pause', syncHero);

  // Respect reduced motion: do not auto-run the loop
  if (prefersReducedMotion()) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }
  syncHero();

  // Save bandwidth: pause the loop while it is off-screen, resume when back
  if ('IntersectionObserver' in window) {
    let userPaused = false;
    heroToggle.addEventListener('click', () => { userPaused = heroVideo.paused; });
    const heroVideoObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) heroVideo.pause();
      else if (!userPaused && !prefersReducedMotion()) heroVideo.play().catch(() => {});
    }, { threshold: 0.1 });
    heroVideoObserver.observe(heroVideo);
  }
}

/* ---------------- Sticky mobile CTA ---------------- */

const stickyCta = document.querySelector('[data-sticky-cta]');
const heroCta = document.querySelector('.hero__action .cta');
const consultationCta = document.querySelector('#consultation .cta');
const footer = document.querySelector('.site-footer');
const trayQuery = window.matchMedia('(max-width: 1023px)');

if (stickyCta && heroCta && 'IntersectionObserver' in window) {
  const state = { heroCtaVisible: true, offerVisible: false, footerVisible: false };

  const apply = () => {
    const show = trayQuery.matches && !state.heroCtaVisible && !state.offerVisible && !state.footerVisible;
    stickyCta.dataset.hidden = String(!show);
    document.body.classList.toggle('has-tray', show);
  };

  new IntersectionObserver(([entry]) => {
    state.heroCtaVisible = entry.isIntersecting;
    apply();
  }, { threshold: 0.5 }).observe(heroCta);

  if (consultationCta) {
    new IntersectionObserver(([entry]) => {
      state.offerVisible = entry.isIntersecting;
      apply();
    }, { threshold: 0.5 }).observe(consultationCta);
  }

  if (footer) {
    new IntersectionObserver(([entry]) => {
      state.footerVisible = entry.isIntersecting;
      apply();
    }, { threshold: 0 }).observe(footer);
  }

  trayQuery.addEventListener('change', apply);
  apply();
}

/* ---------------- Reveal on scroll ---------------- */

const revealTargets = document.querySelectorAll('.reveal');
if (revealTargets.length) {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
    // Safety net: never leave content hidden if the observer misfires
    window.setTimeout(() => revealTargets.forEach((el) => el.classList.add('is-visible')), 4000);
  }
}
