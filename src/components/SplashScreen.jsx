import { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Inicia fade out aos 1.7s, termina aos 2s
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 1700);

    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #ede9fe 100%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Brilho de fundo pulsante */}
      <div
        className="absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          background: 'radial-gradient(circle, rgba(107,63,160,0.18) 0%, transparent 70%)',
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
        }}
      />

      {/* Conteúdo central */}
      <div className="flex flex-col items-center gap-4 relative z-10">

        {/* Logo com animação de entrada */}
        <div
          style={{
            animation: 'logoEnter 1s ease-out forwards',
          }}
        >
          <div
            style={{
              boxShadow: '0 25px 50px -12px rgba(107,63,160,0.45)',
              borderRadius: 24,
              overflow: 'hidden',
              width: 144,
              height: 144,
            }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/6be15c70b_IMG_5204.png"
              alt="Sonatta"
              style={{ width: 144, height: 144, objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Texto com animação de entrada */}
        <div
          className="flex flex-col items-center gap-1"
          style={{
            animation: 'textEnter 1.2s ease-out 0.3s forwards',
            opacity: 0,
          }}
        >
          <h1
            style={{
              color: '#3b1f6e',
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}
          >
            SONATTA
          </h1>
          <p
            style={{
              color: '#6B3FA0',
              fontWeight: 500,
              fontSize: 16,
            }}
          >
            Soluções Auditivas
          </p>
        </div>

        {/* Barra de progresso */}
        <div
          style={{
            animation: 'textEnter 1.2s ease-out 0.3s forwards',
            opacity: 0,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 192,
              height: 4,
              background: 'rgba(107,63,160,0.15)',
              borderRadius: 9999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6B3FA0, #A4D233)',
                borderRadius: 9999,
                animation: 'progressFill 2s linear forwards',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logoEnter {
          from { transform: scale(0.7) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0px); opacity: 1; }
        }
        @keyframes textEnter {
          from { transform: translateY(15px); opacity: 0; }
          to   { transform: translateY(0px); opacity: 1; }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}