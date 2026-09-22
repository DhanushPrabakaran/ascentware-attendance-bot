import { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className={`bg-surfaceHover rounded-xl shadow-2xl border border-borderBase w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-borderBase">
          <h3 className="text-xl font-bold text-secondary tracking-tight">
            {title}
          </h3>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
