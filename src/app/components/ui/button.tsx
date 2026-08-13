import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[#BA5A5A] focus-visible:ring-[#BA5A5A]/25 focus-visible:ring-4 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default: "bg-[#BA5A5A] text-[#FFF9DF] shadow-[0_14px_28px_rgba(186,90,90,0.22)] hover:-translate-y-0.5 hover:bg-[#A94E4E]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[#BA5A5A]/20 bg-[#FFFEF7]/80 text-[#2E3436] hover:-translate-y-0.5 hover:bg-[#F7E49B]/55 hover:text-[#6F3F3F] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-[#86BCBD] text-[#2E3436] shadow-[0_12px_24px_rgba(134,188,189,0.24)] hover:-translate-y-0.5 hover:bg-[#A4CE8B]",
        ghost:
          "text-[#6F3F3F] hover:bg-[#F7E49B]/55 hover:text-[#2E3436] dark:hover:bg-accent/50",
        link: "text-[#BA5A5A] underline-offset-4 hover:text-[#6F3F3F] hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2.5 has-[>svg]:px-3",
        sm: "h-9 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-2xl px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
