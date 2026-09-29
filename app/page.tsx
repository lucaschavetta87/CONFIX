import Link from "next/link";
import { CalendarDays, ClipboardList, Users } from "lucide-react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, tokenValido } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import { Panel } from "@/components/ui";

const tarjetas = [
  {
    href: "/participantes",
    icono: Users,
    titulo: "Participantes",
    texto: "Cargá los miembros de la congregación: nombre, género, teléfono, dirección, fecha de bautismo y las asignaciones que pueden cumplir.",
  },
  {
    href: "/reunion",
    icono: CalendarDays,
    titulo: "Reunión de la semana",
    texto: "Armá la reunión parte por parte y elegí con un buscador quién cumple cada asignación, según los roles de cada participante.",
  },
];

export default async function Home() {
  const store = await cookies();
  const autenticado = await tokenValido(store.get(SESSION_COOKIE)?.value);

  if (!autenticado) {
    return <LoginForm />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">
          Vida y Ministerio Cristianos
        </h1>
        <p className="mt-1 text-sm text-suave">
          Elegí qué querés gestionar hoy.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {tarjetas.map(({ href, icono: Icono, titulo, texto }) => (
          <Link key={href} href={href} className="group block">
            <Panel className="h-full p-6 transition-colors group-hover:border-teal/60">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 text-teal transition-colors group-hover:bg-teal group-hover:text-fondo">
                <Icono size={22} />
              </span>
              <h2 className="mb-2 text-lg font-bold">{titulo}</h2>
              <p className="text-sm leading-relaxed text-suave">{texto}</p>
            </Panel>
          </Link>
        ))}
      </div>

      <Panel className="mt-6 flex items-start gap-3 p-5 text-sm text-suave">
        <ClipboardList size={18} className="mt-0.5 shrink-0 text-teal" />
        <p>
          Cada participante tiene su ficha con las asignaciones que aceptó.
          Cuando armás la reunión, el buscador de cada parte solo propone a
          quienes tildaron ese rol y cumplen con el género requerido.
        </p>
      </Panel>
    </div>
  );
}
