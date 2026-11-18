import { gsap } from 'gsap';

export function mountMotion(root, signal) {
  let visibility;
  const visual = root.querySelector("#hero-visual");
  const motionButton = root.querySelector("#hero-motion");
  const stage = visual?.closest(".hero--immersive");
  if (stage && visual && motionButton && window.IntersectionObserver) {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let paused = false;
    const update = () => {
      for (const element of [stage, visual]) {
        element.classList.toggle("is-animated", !preference.matches);
        element.classList.toggle("is-paused", paused || !visible || document.hidden);
      }
      motionButton.hidden = preference.matches;
      motionButton.setAttribute("aria-pressed", String(paused));
      motionButton.textContent = paused ? "Retomar animação" : "Pausar animação";
    };
    visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { threshold: 0.1 });
    visibility.observe(stage);
    motionButton.addEventListener("click", () => {
      paused = !paused;
      update();
    }, { signal });
    preference.addEventListener("change", update, { signal });
    document.addEventListener("visibilitychange", update, { signal });
    update();
  }

  if (!window.IntersectionObserver) return;
  signal.addEventListener("abort", () => visibility?.disconnect(), { once: true });

  const media = gsap.matchMedia(root);
  signal.addEventListener("abort", () => media.revert(), { once: true });
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const tweens = [gsap.from(".hero-copy > *, .hero-scene", {
      y: 12,
      opacity: 0.75,
      duration: 0.55,
      stagger: 0.045,
      ease: "power2.out"
    })];
    const targets = root.querySelectorAll(
      ".practice-heading, .practice-window, .sequence > article, .section-head > *, .product-shot, .proof-points > article, .tutor-story, .track-layout, .tower-layout, .journey-note, .interview, .faq > *, .end"
    );
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        tweens.push(gsap.from(entry.target, {
          y: 14,
          opacity: 0.8,
          duration: 0.55,
          ease: "power2.out",
          overwrite: "auto"
        }));
      });
    }, { threshold: 0.08 });

    targets.forEach((target) => observer.observe(target));
    const detailObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        detailObserver.unobserve(target);
        const items = target.querySelectorAll(
          ".conversation, article, .tower-list > div, .badge-list span, .proof-demo-copy > *, .proof-demo-shot, .faq-list > details"
        );
        if (items.length) tweens.push(gsap.from(items, {
          x: -8, opacity: .8, duration: .45, stagger: .07, ease: "power2.out"
        }));
      });
    }, { threshold: .12 });
    root.querySelectorAll(".tutor-dialogue, .track-result, .tower-copy, .pricing-grid, .proof-demo--compact, .faq-list")
      .forEach(target => detailObserver.observe(target));
    let feedbackTween;
    let successTween;
    let challengeTween;
    const feedback = () => {
      feedbackTween?.kill();
      feedbackTween = gsap.fromTo(".try-result, .mentor blockquote, .sandbox-console li, .journey-preview", { y: 3 }, {
        y: 0, duration: .3, ease: "power2.out", overwrite: "auto"
      });
    };
    const success = () => {
      successTween?.kill();
      successTween = gsap.fromTo(".practice-window", {
        borderColor: "#baffd2", boxShadow: "0 0 0 3px #a5efbd55, 0 28px 75px #0009"
      }, {
        borderColor: "#a2e3bf77", boxShadow: "0 35px 100px #000b, 0 0 90px #6acb9d1c",
        duration: 1, ease: "power2.out"
      });
    };
    const challengeChange = () => {
      challengeTween?.kill();
      challengeTween = gsap.fromTo(".challenge-skill", { y: 7, opacity: 0.65 }, {
        y: 0, opacity: 1, duration: 0.3, ease: "power2.out", overwrite: "auto"
      });
    };
    root.addEventListener("sandbox-feedback", feedback, { signal });
    root.addEventListener("sandbox-success", success, { signal });
    root.addEventListener("sandbox-challenge-change", challengeChange, { signal });
    return () => {
      observer.disconnect();
      detailObserver.disconnect();
      root.removeEventListener("sandbox-feedback", feedback);
      root.removeEventListener("sandbox-success", success);
      root.removeEventListener("sandbox-challenge-change", challengeChange);
      feedbackTween?.revert();
      successTween?.revert();
      challengeTween?.revert();
      tweens.forEach((tween) => tween.progress(1).kill());
    };
  });
}
