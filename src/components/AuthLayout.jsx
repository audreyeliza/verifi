import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="bg-brand-card inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] mb-5 shadow-[0_16px_32px_-16px_rgba(47,79,230,0.8)]">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-[30px] font-semibold tracking-tight text-navy">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-[1.75rem] shadow-card border border-border/70 p-6 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
