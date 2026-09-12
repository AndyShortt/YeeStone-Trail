import { useEffect, type ReactNode } from "react";

const overlayPanelImg = "/images/ui-overlay-panel.png";

export interface OverlayPanelOption {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

interface OverlayPanelProps {
  body?: ReactNode | ReactNode[];
  options?: OverlayPanelOption[];
  onDismiss?: () => void;
  /** Overrides the body paragraphs' text-size class (default "text-sm sm:text-lg") for this call only. */
  bodyTextClassName?: string;
  /**
   * Floors the panel's height above its normal aspect-[1024/384]-derived
   * value, for a call whose content doesn't fit the ~5-6-line budget that
   * ratio gives at text-lg (e.g. a longer body at a deliberately larger
   * bodyTextClassName). The background image still stretches to fill the
   * taller box — fine for the parchment texture/border at a modest bump,
   * but this isn't meant for large increases.
   */
  minHeightPx?: number;
}

function OverlayPanel({ body, options, onDismiss, bodyTextClassName = "text-sm sm:text-lg", minHeightPx }: OverlayPanelProps) {
  const paragraphs = body === undefined ? [] : Array.isArray(body) ? body : [body];
  const hasOptions = Boolean(options && options.length > 0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (options && options.length > 0) {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < options.length && !options[index].disabled) {
          event.preventDefault();
          options[index].onSelect();
        }
        return;
      }

      if (onDismiss && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onDismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options, onDismiss]);

  return (
    <div
      className="absolute inset-x-0 bottom-0 aspect-[1024/384] w-full select-none bg-amber-200"
      style={minHeightPx ? { minHeight: `${minHeightPx}px` } : undefined}
      onClick={() => {
        if (!hasOptions) {
          onDismiss?.();
        }
      }}
    >
      <img
        src={overlayPanelImg}
        alt=""
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />

      <div className="absolute inset-0 flex flex-col justify-center gap-1 overflow-hidden px-[8%] py-[3%] text-amber-950">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className={`${bodyTextClassName} leading-tight`}>
            {paragraph}
          </p>
        ))}

        {hasOptions && (
          <div className="mt-1 flex flex-col gap-0.5">
            {options!.map((option, i) => (
              <button
                key={option.label}
                type="button"
                disabled={option.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  option.onSelect();
                }}
                className="cursor-pointer text-left text-sm leading-tight hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-lg"
              >
                {i + 1}. {option.label}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default OverlayPanel;
