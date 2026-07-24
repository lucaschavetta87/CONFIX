"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FaChevronDown, 
  FaWhatsapp,
  FaInstagram, 
  FaTiktok,
  FaTimes,
  FaMobileAlt, 
  FaTools,
  FaBoxOpen,
  FaMicrochip
} from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import SplitText from '../components/SplitText';
import ShapeGrid from '../components/ShapeGrid';

// --- INTERFACES ---
interface Producto { id: number; nombre: string; precio: number; img: string; categoria: string; }
interface EquipoData { nombre: string; equipo: string; estado_orden: string; falla: string; }

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
    window.open(`https://wa.me/2612194199?text=${encodeURIComponent(msg)}`, '_blank');
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

  return (
    <div style={{ minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', position: 'relative', backgroundColor: 'transparent', overflowX: 'hidden' }}>
      
      {/* CAPA DE FONDO ANIMADO */}
      <ShapeGrid 
        direction="diagonal" speed={0.5} 
        borderColor="rgba(255,255,255,0.15)" hoverFillColor={azulConfix} squareSize={50}
      />

      {/* NAVBAR */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', padding: '0 5%', alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 1000, borderBottom: '1px solid #222', height: '80px' 
      }}>
        <div onClick={() => setVista('inicio')} style={{ fontSize: '1.8rem', fontWeight: '900', cursor: 'pointer', letterSpacing: '1px' }}>
          CONFIX
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setMenuAbierto(!menuAbierto)}
              style={{ background: 'none', border: '1px solid #333', color: '#fff', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}
            >
              MENÚ <FaChevronDown size={10} style={{ marginLeft: '5px' }} />
            </button>

            {menuAbierto && (
              <div style={{ position: 'absolute', top: '50px', right: 0, backgroundColor: '#111', border: '1px solid #333', borderRadius: '10px', width: '180px', zIndex: 1200 }}>
                <div onClick={() => { setVista('tienda'); setCategoriaActiva('todos'); setMenuAbierto(false); }} style={{ padding: '15px', cursor: 'pointer', borderBottom: '1px solid #222' }}>Ver Catálogo</div>
                <div onClick={() => { setVista('inicio'); setMenuAbierto(false); }} style={{ padding: '15px', cursor: 'pointer' }}>Reparaciones</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* REDES SOCIALES FLOTANTES */}
      <div style={{ position: 'fixed', left: '20px', bottom: '100px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 2000 }}>
        <a href="https://instagram.com/confix.mza" target="_blank" rel="noreferrer" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222', transition: '0.3s' }}>
          <FaInstagram size={22} />
        </a>
        <a href="https://tiktok.com/@confix.mza" target="_blank" rel="noreferrer" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222', transition: '0.3s' }}>
          <FaTiktok size={22} />
        </a>
      </div>

      {/* CHATBOT */}
      <div style={{ position: 'fixed', right: '30px', bottom: '30px', zIndex: 3000 }}>
        {chatAbierto && (
          <div style={{ 
            backgroundColor: '#111', width: '300px', borderRadius: '20px', border: '1px solid #222', 
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)', marginBottom: '15px', overflow: 'hidden',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <div style={{ backgroundColor: azulConfix, padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaWhatsapp size={24} />
                <span style={{ fontWeight: 'bold' }}>CONFIX Bot</span>
              </div>
              <FaTimes onClick={() => setChatAbierto(false)} style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '0.9rem', color: '#ccc' }}>¡Hola! 👋 ¿En qué podemos ayudarte?</p>
              <button onClick={() => enviarWhatsApp("Hola! Necesito consultar por una reparación.")} style={{ textAlign: 'left', padding: '10px 15px', backgroundColor: '#222', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>🛠️ Reparaciones</button>
              <button onClick={() => enviarWhatsApp("Hola! Consulto por repuestos.")} style={{ textAlign: 'left', padding: '10px 15px', backgroundColor: '#222', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>🔌 Repuestos</button>
              <button onClick={() => enviarWhatsApp("Hola! Info de accesorios.")} style={{ textAlign: 'left', padding: '10px 15px', backgroundColor: '#222', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>📱 Accesorios</button>
            </div>
          </div>
        )}
        <button onClick={() => setChatAbierto(!chatAbierto)} style={{ backgroundColor: '#25d366', color: '#fff', width: '65px', height: '65px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaWhatsapp size={35} />
        </button>
      </div>

      {/* MODAL RELLENABLE FLOTANTE - CONSULTA DE REPUESTO */}
      {modalRepuestoAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', width: '100%', maxWidth: '500px', borderRadius: '25px', padding: '30px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', animation: 'fadeInUp 0.3s ease-out' }}>
            <FaTimes onClick={() => setModalRepuestoAbierto(false)} style={{ position: 'absolute', top: '25px', right: '25px', cursor: 'pointer', opacity: 0.6 }} size={20} />
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '8px', color: '#fff', textAlign: 'center' }}>¿QUÉ REPUESTO NECESITÁS?</h3>
            <p style={{ fontSize: '0.85rem', color: '#777', textAlign: 'center', marginBottom: '25px' }}>Completá los detalles y te responderemos al instante por WhatsApp.</p>
            
            <form onSubmit={cuatrimestreRepuestoWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Tu Nombre" value={formRepuesto.nombre} onChange={e => setFormRepuesto({...formRepuesto, nombre: e.target.value})} required style={estiloInput} />
              <input type="text" placeholder="Tu WhatsApp" value={formRepuesto.whatsapp} onChange={e => setFormRepuesto({...formRepuesto, whatsapp: e.target.value})} style={estiloInput} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold', marginLeft: '5px' }}>TIPO DE REPUESTO:</label>
                <select value={formRepuesto.tipo} onChange={e => setFormRepuesto({...formRepuesto, tipo: e.target.value})} style={{ ...estiloInput, cursor: 'pointer' }}>
                  <option value="pantalla">📱 Pantalla / Módulo</option>
                  <option value="bateria">🔋 Batería</option>
                  <option value="pin de carga">🔌 Pin de Carga</option>
                  <option value="tapa trasera">💎 Tapa Trasera</option>
                  <option value="camara">📷 Cámara</option>
                  <option value="otro">🛠️ Otro componente</option>
                </select>
              </div>

              <input type="text" placeholder="¿Para qué equipo? (Ej: iPhone 13 Pro Max)" value={formRepuesto.equipo} onChange={e => setFormRepuesto({...formRepuesto, equipo: e.target.value})} required style={estiloInput} />
              
              <button type="submit" style={{ backgroundColor: azulConfix, color: '#fff', padding: '16px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '10px', fontSize: '0.95rem' }}>
                CONSULTAR DISPONIBILIDAD
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ padding: '30px 5%', position: 'relative', zIndex: 1 }}>
        
        {vista === 'inicio' && (
          <div style={{ maxWidth: '1100px', margin: '20px auto', textAlign: 'center' }}>
            <div style={{ marginBottom: '10px' }}>
              <SplitText
                text="CONFIX" tag="h1" className="titulo-confix" delay={50}
                animationFrom={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                animationTo={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                duration={0.8} threshold={0.2} textAlign="center"
                style={{ fontSize: '4.5rem', fontWeight: '900', letterSpacing: '2px', margin: 0 }}
              />
            </div>
            <p style={{ opacity: 0.9, marginBottom: '20px', fontWeight: '300', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Tecnología que evoluciona, confianza que permanece
            </p>

            {/* NUESTROS SERVICIOS CONVERTIDOS EN BOTONES INTERACTIVOS */}
            <div style={{ marginTop: '50px', marginBottom: '80px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '40px', letterSpacing: '3px', color: '#fff', WebkitTextStroke: '1px #000', textTransform: 'uppercase' }}>NUESTROS SERVICIOS</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                
                {/* BOTÓN VENTA DE ACCESORIOS */}
                <div 
                  onClick={() => { setVista('tienda'); setCategoriaActiva('accesorios'); }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = azulConfix}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
                  style={estiloTarjetaServicio}
                >
                  <FaBoxOpen size={30} color={azulConfix} style={{ marginBottom: '15px' }} />
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', fontWeight: '700' }}>VENTA DE ACCESORIOS</h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: '1.6' }}>Fundas premium, auriculares y periféricos gamer para tu setup.</p>
                </div>

                {/* BOTÓN VENTA DE REPUESTOS */}
                <div 
                  onClick={() => setModalRepuestoAbierto(true)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = azulConfix}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
                  style={estiloTarjetaServicio}
                >
                  <FaMicrochip size={30} color={azulConfix} style={{ marginBottom: '15px' }} />
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', fontWeight: '700' }}>VENTA DE REPUESTOS</h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: '1.6' }}>Distribución de pantallas, baterías y herramientas profesionales.</p>
                </div>

                {/* BOTÓN VENTA DE EQUIPOS */}
                <div 
                  onClick={() => { setVista('tienda'); setCategoriaActiva('celulares'); }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = azulConfix}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
                  style={estiloTarjetaServicio}
                >
                  <FaMobileAlt size={30} color={azulConfix} style={{ marginBottom: '15px' }} />
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', fontWeight: '700' }}>VENTA DE EQUIPOS</h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: '1.6' }}>Equipos usados garantizados y nuevos sellados de todas las marcas.</p>
                </div>

                {/* BOTÓN SERVICIO TÉCNICO */}
                <div 
                  onClick={() => seccionPresupuestoRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  onMouseEnter={e => e.currentTarget.style.borderColor = azulConfix}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
                  style={estiloTarjetaServicio}
                >
                  <FaTools size={30} color={azulConfix} style={{ marginBottom: '15px' }} />
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', fontWeight: '700' }}>SERVICIO TÉCNICO</h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: '1.6' }}>Reparación especializada de alta complejidad Apple y Android.</p>
                </div>

              </div>
            </div>

            {/* FORMULARIOS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '700px', margin: '0 auto' }}>
              
              {/* PRESUPUESTO ONLINE REFERENCIADO */}
              <div ref={seccionPresupuestoRef} style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(12px)', padding: '35px', borderRadius: '25px', border: '1px solid #222', textAlign: 'left' }}>
                <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', textAlign: 'center' }}>PRESUPUESTO <span style={{ color: azulConfix }}>ONLINE</span></h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input type="text" id="presu-nombre" placeholder="Nombre" style={estiloInput} />
                  <input type="text" id="presu-equipo" placeholder="Equipo" style={estiloInput} />
                  <textarea id="presu-falla" placeholder="Describí la falla..." rows={3} style={estiloInput}></textarea>
                  <button onClick={() => {
                      const nombre = (document.getElementById('presu-nombre') as HTMLInputElement).value;
                      const eq = (document.getElementById('presu-equipo') as HTMLInputElement).value;
                      const falla = (document.getElementById('presu-falla') as HTMLTextAreaElement).value;
                      if(!nombre || !falla) return alert("Por favor, completá nombre y falla.");
                      enviarWhatsApp(`Hola CONFIX! Mi nombre es *${nombre}*. Necesito presupuesto para un *${eq}*. Falla: ${falla}`);
                    }} style={{ backgroundColor: azulConfix, color: '#fff', padding: '18px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>SOLICITAR POR WHATSAPP</button>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(12px)', padding: '35px', borderRadius: '25px', border: '1px solid #222', textAlign: 'left' }}>
                <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', textAlign: 'center' }}>COTIZÁ TU <span style={{ color: azulConfix }}>CELULAR USADO</span></h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <input type="text" id="cotiz-nombre" placeholder="Nombre" style={estiloInput} />
                  <input type="text" id="cotiz-tel" placeholder="Tu WhatsApp" style={estiloInput} />
                  <input type="text" id="cotiz-equipo" placeholder="¿Qué equipo tenés?" style={estiloInput} />
                  <input type="text" id="cotiz-bateria" placeholder="Batería % (Si es iPhone)" style={estiloInput} />
                  <input type="text" id="cotiz-capacity" placeholder="Capacidad (Ej: 128GB)" style={estiloInput} />
                  <input type="text" id="cotiz-permuta" placeholder="¿Por cuál querés permutar?" style={estiloInput} />
                  <div style={{ gridColumn: '1 / -1' }}><textarea id="cotiz-detalles" placeholder="Detalles estéticos..." rows={2} style={estiloInput}></textarea></div>
                  <button onClick={() => {
                      const n = (document.getElementById('cotiz-nombre') as HTMLInputElement).value;
                      const e = (document.getElementById('cotiz-equipo') as HTMLInputElement).value;
                      if(!n || !e) return alert("Completá nombre y equipo.");
                      const msj = `🚀 *COTIZACIÓN USADO - CONFIX*\n👤 *Nombre:* ${n}\n📲 *Equipo:* ${e}`;
                      enviarWhatsApp(msj);
                      const aviso = document.getElementById('aviso-cotiz');
                      if(aviso) aviso.style.display = 'block';
                    }} style={{ gridColumn: '1 / -1', backgroundColor: '#fff', color: '#000', padding: '18px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>COTIZAR EQUIPO</button>
                </div>
                <p id="aviso-cotiz" style={{ display: 'none', marginTop: '15px', textAlign: 'center', fontSize: '0.85rem', color: azulConfix, fontWeight: 'bold' }}>En minutos te enviaremos un whatsapp con tu cotización</p>
              </div>

              {/* SEGUIMIENTO DE REPARACIÓN FLEXIBLE */}
              <div style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(12px)', padding: '35px', borderRadius: '25px', border: `1px solid #222`, textAlign: 'left' }}>
                <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', textAlign: 'center' }}>SEGUI TU <span style={{ color: azulConfix }}>REPARACION</span></h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input type="text" placeholder="Nro de Orden" value={ordenBusqueda} onChange={(e) => setOrdenBusqueda(e.target.value)} style={estiloInput} />
                  <input type="text" placeholder="Teléfono" value={telBusqueda} onChange={(e) => setTelBusqueda(e.target.value)} style={estiloInput} />
                  <button onClick={buscarEstado} disabled={cargando} style={{ width: '100%', padding: '18px', borderRadius: '12px', backgroundColor: azulConfix, color: '#ffffff', fontWeight: '900', border: 'none', cursor: 'pointer' }}>
                    {cargando ? 'BUSCANDO...' : 'CONSULTAR ESTADO'}
                  </button>

                  {/* RENDERIZADO VISUAL DEL ESTADO DE REPARACIÓN */}
                  {equipo && (
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '20px', 
                      borderRadius: '15px', 
                      backgroundColor: 'rgba(255,255,255,0.05)', 
                      border: '1px solid #333',
                      animation: 'fadeInUp 0.3s ease-out'
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                        👤 Cliente: <span style={{ fontWeight: 'normal', color: '#ccc' }}>{equipo.nombre}</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>
                        📱 Equipo: <span style={{ fontWeight: 'normal', color: '#ccc' }}>{equipo.equipo}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Estado actual:</span>
                        <span style={{ 
                          padding: '6px 14px', 
                          borderRadius: '30px', 
                          fontSize: '0.8rem', 
                          fontWeight: '800', 
                          textTransform: 'uppercase',
                          border: '1px solid',
                          backgroundColor: 
                            String(equipo.estado_orden).toLowerCase() === 'entregado' ? 'rgba(59, 130, 246, 0.15)' : 
                            String(equipo.estado_orden).toLowerCase() === 'listo' ? 'rgba(34, 197, 94, 0.15)' : 
                            'rgba(245, 158, 11, 0.15)',
                          color: 
                            String(equipo.estado_orden).toLowerCase() === 'entregado' ? '#3b82f6' : 
                            String(equipo.estado_orden).toLowerCase() === 'listo' ? '#22c55e' : 
                            '#f59e0b'
                        }}>
                          {equipo.estado_orden || 'Pendiente'}
                        </span>
                      </div>
                      {equipo.falla && (
                        <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' }}>
                          Falla bajo revisión: {equipo.falla}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MAPA */}
            <div style={{ marginTop: '80px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '40px', letterSpacing: '3px', color: '#fff', WebkitTextStroke: '1px #000', textTransform: 'uppercase' }}>DÓNDE NOS ENCONTRAMOS</h2>
              <div style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(12px)', padding: '20px', borderRadius: '35px', border: '1px solid #222', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <iframe src="https://maps.google.com/maps?q=Catamarca+42,+Mendoza,+Argentina&z=18&output=embed" width="100%" height="450" style={{ border: 0, borderRadius: '20px' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                <div style={{ marginTop: '20px', opacity: 0.8 }}>
                  <p>📍 Catamarca 42, Mendoza, Argentina</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIENDA / VITRINA DE CATÁLOGO */}
        {vista === 'tienda' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '25px', fontSize: '2rem', textAlign: 'center' }}>CATALOGO <span style={{ color: azulConfix }}>CONFIX</span></h2>
            
            {/* BOTONES DE FILTRADO POR CATEGORÍAS */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '35px', flexWrap: 'wrap' }}>
              <button onClick={() => setCategoriaActiva('todos')} style={estiloTabCategoria('todos')}>Todos</button>
              <button onClick={() => setCategoriaActiva('celulares')} style={estiloTabCategoria('celulares')}>Celulares</button>
              <button onClick={() => setCategoriaActiva('accesorios')} style={estiloTabCategoria('accesorios')}>Accesorios</button>
            </div>

            {productosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5, fontSize: '1rem', border: '1px dashed #333', borderRadius: '20px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                No hay productos cargados en esta categoría actualmente.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
                {productosFiltrados.map((p) => (
                  <div key={p.id} style={{ backgroundColor: 'rgba(17, 17, 17, 0.85)', backdropFilter: 'blur(10px)', borderRadius: '20px', overflow: 'hidden', border: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <img src={p.img} alt={p.nombre} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</h4>
                      
                      {/* CONTENEDOR VERTICAL PARA PRECIO ARRIBA Y BOTÓN ABAJO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                        <span style={{ color: azulConfix, fontWeight: 'bold', fontSize: '1.35rem' }}>${p.precio.toLocaleString('es-AR')}</span>
                        <button 
                          onClick={() => enviarWhatsApp(`Hola CONFIX! Me interesa conocer la disponibilidad por el producto: *${p.nombre}* con precio *$${p.precio.toLocaleString('es-AR')}*.`)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#25d366', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: '0.2s' }}
                        >
                          <FaWhatsapp size={16} /> CONSULTAR
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '60px 0', opacity: 0.2, fontSize: '0.8rem', position: 'relative', zIndex: 1 }}>CONFIX 2026 - MENDOZA</footer>
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}