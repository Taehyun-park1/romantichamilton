import { ArrowUp } from 'lucide-react';

export default function BackToTopButton() {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="맨위로 이동"
      title="맨위로"
      className="fixed right-4 md:right-6 bottom-[20vh] z-40 grid h-8 w-16 place-items-center border border-foreground/10 bg-background/70 text-foreground/65 shadow-sm backdrop-blur transition-colors hover:bg-background/90 hover:text-foreground"
    >
      <ArrowUp size={17} />
    </button>
  );
}
