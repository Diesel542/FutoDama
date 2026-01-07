import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface SidebarPortalProps {
  targetId: string;
  children: React.ReactNode;
}

export default function SidebarPortal({ targetId, children }: SidebarPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById(targetId);
    setContainer(element);
  }, [targetId]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}
