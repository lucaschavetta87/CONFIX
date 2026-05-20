"use client";
import React, { useState } from 'react';

// --- ICONO DE CHAT PROFESIONAL (SVG) ---
// Este icono es de la librería 'Lucide' y siempre se verá bien.
const IconoChat = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    width="28" 
    height="28" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
  >
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);

export default function WhatsAppChat() {
  const [isOpen, setIsOpen] = useState(false);
  const colorWA = "#25D366";
  const azulModerno = "#3b82f6";
  const colorFondoChat = "#111827"; // Un tono más oscuro que '#1e293b'

  const opciones = [
    { label: "Consultar presupuesto", msg: "Hola! Quisiera solicitar un presupuesto para mi equipo." },
    { label: "Estado de mi reparación", msg: "Hola! Quisiera saber el estado de mi orden de servicio." },
    { label: "Venta de repuestos/equipos", msg: "Hola! Estoy interesado en comprar repuestos o equipos." },
  ];

  const irAWhatsApp = (mensaje: string) => {
    const nro = "5492613732989";
    const url = `https://wa.me/${nro}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 2000, fontFamily: 'sans-serif' }}>
      
      {/* VENTANA DEL CHAT */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '0',
          width: '320px',
          backgroundColor: colorFondoChat,
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          animation: 'fadeInUp 0.3s ease'
        }}>
          {/* Header del Chatbot (Elegante) */}
          <div style={{ backgroundColor: azulModerno, padding: '20px', textAlign: 'center' }}>
            {/* Aquí puedes poner tu logo o iniciales */}
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#fff',
              borderRadius: '50%',
              margin: '0 auto 10px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.2rem',
              fontWeight: '900',
              color: azulModerno,
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              CC
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>Soporte ControlCel</div>
            <div style={{ fontSize: '0.8rem', color: '#fff', opacity: 0.9 }}>Hola 👋 ¿En qué podemos ayudarte?</div>
          </div>

          {/* Opciones del Chat (Estilo Tarjeta) */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {opciones.map((opt, i) => (
              <button
                key={i}
                onClick={() => irAWhatsApp(opt.msg)}
                style={{
                  padding: '12px 15px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.2s, transform 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTÓN GLOBO (EL DISPARADOR) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: isOpen ? '#f43f5e' : colorWA,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 5px 20px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
      >
        {isOpen ? (
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>✕</span>
        ) : (
          <div style={{ color: '#fff', display: 'flex' }}>
            <IconoChat />
          </div>
        )}
      </button>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}