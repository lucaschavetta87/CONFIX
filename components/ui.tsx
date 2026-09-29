import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-linea bg-tarjeta shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

const variantes = {
  primario:
    "bg-teal text-fondo hover:bg-teal2 font-bold disabled:opacity-50 disabled:cursor-not-allowed",
  secundario:
    "border border-linea bg-tarjeta2 text-texto hover:border-suave font-semibold",
  fantasma: "text-suave hover:text-texto hover:bg-tarjeta2 font-semibold",
  peligro: "border border-rojo/40 text-rojo hover:bg-rojo/10 font-semibold",
};

export function Boton({
  variante = "primario",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof variantes;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors",
        variantes[variante],
        className,
      )}
    />
  );
}

export function Campo({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold tracking-widest text-suave uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-suave">{hint}</span>}
    </label>
  );
}

const baseInput =
  "w-full rounded-xl border border-linea bg-tarjeta2 px-3.5 py-2.5 text-sm text-texto outline-none transition-colors placeholder:text-suave/60 focus:border-teal";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...resto } = props;
  return <input {...resto} className={cn(baseInput, className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...resto } = props;
  return (
    <select
      {...resto}
      className={cn(baseInput, "cursor-pointer appearance-none", className)}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...resto } = props;
  return <textarea {...resto} className={cn(baseInput, "resize-y", className)} />;
}

export function Etiqueta({
  children,
  tono = "neutro",
  className,
}: {
  children: ReactNode;
  tono?: "neutro" | "teal" | "verde" | "rojo";
  className?: string;
}) {
  const tonos = {
    neutro: "border-linea bg-tarjeta2 text-suave",
    teal: "border-teal/40 bg-teal/10 text-teal",
    verde: "border-verde/40 bg-verde/10 text-verde",
    rojo: "border-rojo/40 bg-rojo/10 text-rojo",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        tonos[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-6 text-2xl font-black tracking-tight sm:text-3xl">
      {children}
    </h1>
  );
}
