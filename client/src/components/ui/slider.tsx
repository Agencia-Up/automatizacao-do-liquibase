import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 1, max = 10, step = 1, ...props }, ref) => (
    <input
      type="range"
      ref={ref}
      min={min}
      max={max}
      step={step}
      className={cn(
        "w-full h-2 cursor-pointer appearance-none rounded-full bg-muted accent-brand-orange",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-orange [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md",
        "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-orange [&::-moz-range-thumb]:border-0",
        className
      )}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

export { Slider };
