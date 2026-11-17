import { useEffect, useState } from 'react';

interface FloatingPreviewLinkProps {
  targetId?: string;
}

export function FloatingPreviewLink({ targetId = 'hero-stage' }: FloatingPreviewLinkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(!entry.isIntersecting);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const handleScrollToPreview = () => {
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button
      type="button"
      onClick={handleScrollToPreview}
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      aria-label="Scroll back to model preview"
      className={`fixed bottom-[18px] right-[18px] z-40 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#1C1B18] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_26px_rgba(28,27,24,0.28)] transition duration-200 min-[1141px]:hidden ${
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2.5 opacity-0'
      }`}
    >
      ↑ Preview
    </button>
  );
}
