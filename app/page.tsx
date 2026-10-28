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

<<<<<<< HEAD
export default function ConfixWeb() {
  const azulConfix = "#3b82f6";

  // --- REFERENCIA PARA EL SCROLL AL PRESUPUESTO ---
  const seccionPresupuestoRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS ---
  const [vista, setVista] = useState<'inicio' | 'tienda'>('inicio'); 
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [ordenBusqueda, setOrdenBusqueda] = useState('');
  const [telBusqueda, setTelBusqueda] = useState('');
  const [equipo, setEquipo] = useState<EquipoData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(false);
  
  // Nuevo estado para saber qué categoría filtrar en pantalla
  const [categoriaActiva, setCategoriaActiva] = useState<'todos' | 'celulares' | 'accesorios'>('todos');

  // --- NUEVOS ESTADOS PARA MODAL DE REPUESTOS ---
  const [modalRepuestoAbierto, setModalRepuestoAbierto] = useState(false);
  const [formRepuesto, setFormRepuesto] = useState({ nombre: '', whatsapp: '', tipo: 'pantalla', equipo: '' });

  // --- ESTADO PARA EL STOCK REAL ---
  const [productosBase, setProductosBase] = useState<Producto[]>([]);

  // --- CARGA DEL STOCK DESDE SUPABASE ---
  const cargarProductosNube = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .gt('cantidad', 0) // Trae solo lo que tenga unidades físicas en el taller
        .order('nombre', { ascending: true });

      if (error) throw error;

      if (data) {
        const productosMapeados = data.map((item: any) => ({
          id: item.id,
          nombre: item.nombre,
          precio: Number(item.precio_venta || item.precio || 0),
          img: item.imagen_url || `https://picsum.photos/seed/${item.id}/300/300`,
          categoria: String(item.categoria || '').toLowerCase().trim()
        }));
        setProductosBase(productosMapeados);
      }
    } catch (err) {
      console.error("Error cargando el catálogo desde la nube:", err);
    }
  };

  useEffect(() => {
    cargarProductosNube();
  }, []);

  // --- LÓGICA DE FILTRADO DINÁMICO ---
  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === 'todos') return productosBase;
    return productosBase.filter(p => p.categoria === categoriaActiva);
  }, [productosBase, categoriaActiva]);

  // --- FUNCIONES ---
  const buscarEstado = async () => {
    if (!ordenBusqueda || !telBusqueda) return;
    setCargando(true);
    setEquipo(null); 
    try {
      const nroOrdenClean = ordenBusqueda.trim();
      const telefonoClean = telBusqueda.trim();
      const telSoloNumeros = telefonoClean.replace(/\D/g, '');

      const { data: ordenesCandidatas, error } = await supabase
        .from('ordenes')
        .select('*');

      if (error) throw error;

      if (ordenesCandidatas) {
        const ordenEncontrada = ordenesCandidatas.find((o: any) => {
          const dbIdStr = String(o.id);
          const dbTelStr = String(o.telefono || '').replace(/\D/g, '');
          const coincideId = dbIdStr.endsWith(nroOrdenClean) || dbIdStr === nroOrdenClean;
          const coincideTel = dbTelStr.endsWith(telSoloNumeros.slice(-8)) || telSoloNumeros.endsWith(dbTelStr.slice(-8));
          return coincideId && coincideTel;
        });

        if (ordenEncontrada) {
          setEquipo(ordenEncontrada as EquipoData);
        } else {
          alert("No se encontró ninguna orden con esos datos. Verificá que el número de orden y tu teléfono coincidan con los del ticket.");
        }
      } else {
        alert("No se encontraron órdenes en la base de datos.");
      }
    } catch (err: any) { 
      console.error("Error al buscar el estado de reparación:", err.message || err); 
      alert("Hubo un problema al consultar la base de datos: " + (err.message || "Error desconocido"));
    }
    setCargando(false);
  };

  const enviarWhatsApp = (msg: string) => {
    window.open(`https://wa.me/2616823890?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const cuatrimestreRepuestoWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRepuesto.nombre || !formRepuesto.equipo) {
      return alert("Por favor, completá los campos necesarios para la consulta.");
    }
    const mensajeRepuesto = `🔌 *CONSULTA DE REPUESTO - CONFIX*\n\n👤 *Nombre:* ${formRepuesto.nombre}\n📱 *WhatsApp:* ${formRepuesto.whatsapp || '---'}\n⚙️ *Tipo de repuesto:* ${formRepuesto.tipo.toUpperCase()}\n📦 *Equipo:* ${formRepuesto.equipo}`;
    enviarWhatsApp(mensajeRepuesto);
    setModalRepuestoAbierto(false);
    setFormRepuesto({ nombre: '', whatsapp: '', tipo: 'pantalla', equipo: '' });
  };

  const estiloInput = {
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid #333',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as 'border-box'
  };

  const estiloTabCategoria = (idTab: 'todos' | 'celulares' | 'accesorios') => ({
    padding: '10px 24px',
    borderRadius: '30px',
    border: `1px solid ${categoriaActiva === idTab ? azulConfix : '#333'}`,
    backgroundColor: categoriaActiva === idTab ? azulConfix : 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.85rem',
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.2s ease'
  });

  const estiloTarjetaServicio = {
    backgroundColor: 'rgba(15, 15, 15, 0.8)',
    backdropFilter: 'blur(10px)',
    padding: '30px',
    borderRadius: '25px',
    border: '1px solid #222',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    outline: 'none'
  };
=======
  if (!autenticado) {
    return <LoginForm />;
  }
>>>>>>> cd8b9b3e72c8b1871fdfa0d92bddb7e0a5c6423e

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
