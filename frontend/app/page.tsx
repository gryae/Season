import Link from 'next/link';
import { Anchor, Shield, Map, ClipboardList, Package, ArrowRight, Waves } from 'lucide-react';

// Pure CSS hover — no client JS needed, works as a Server Component

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0514 0%, #1a0845 40%, #0f172a 100%)',
      }}
    >
      {/* Animated background orbs */}
      <div
        className="absolute top-20 left-20 w-96 h-96 rounded-full opacity-20 animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(80px)' }}
      />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-15 animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)', filter: 'blur(80px)', animationDelay: '1.5s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', filter: 'blur(120px)' }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center season-glow"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)' }}
          >
            <Anchor size={40} color="white" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-7xl font-black mb-4 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
          Sea<span style={{
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Son</span>
        </h1>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Waves size={16} style={{ color: '#a78bfa' }} />
          <p className="text-lg font-light tracking-widest uppercase" style={{ color: '#a78bfa', letterSpacing: '0.3em' }}>
            The Son of Sea
          </p>
          <Waves size={16} style={{ color: '#a78bfa' }} />
        </div>
        <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
          Enterprise Maritime Fleet Management Platform. Real-time GPS tracking, preventive maintenance automation, inventory control, and compliance monitoring — all in one unified system.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {[
            { icon: Map, label: 'Live GPS Tracking' },
            { icon: ClipboardList, label: 'Auto Work Orders' },
            { icon: Package, label: 'Smart Inventory' },
            { icon: Shield, label: 'Compliance Tracking' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#c4b5fd',
              }}
            >
              <Icon size={14} />
              {label}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        {/* CTA — pure CSS hover, no client JS */}
        <style>{`
          .cta-btn {
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            box-shadow: 0 0 40px rgba(124, 58, 237, 0.5), 0 4px 20px rgba(0,0,0,0.3);
            text-decoration: none;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
          .cta-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 0 60px rgba(124, 58, 237, 0.7), 0 8px 30px rgba(0,0,0,0.4);
          }
        `}</style>
        <Link
          href="/dashboard"
          className="cta-btn inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-season-text font-bold text-lg"
        >
          <Anchor size={20} />
          Enter Bridge
          <ArrowRight size={20} />
        </Link>

        <p className="mt-6 text-sm" style={{ color: '#4b5563' }}>
          SeaSon v1.0 · Maritime Management Platform · © 2026
        </p>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #0ea5e9, #7c3aed)' }} />
    </div>
  );
}
