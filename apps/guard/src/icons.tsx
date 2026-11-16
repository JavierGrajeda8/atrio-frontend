import type { ReactNode, SVGProps } from "react";

// Íconos de trazo de 2 px (estilo Lucide), decorativos: siempre van junto a texto.
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const WifiIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 14 0M2 8.8a15 15 0 0 1 20 0" />
  </Icon>
);

export const WifiOffIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.4-1.8M2 8.8a15 15 0 0 1 4.2-2.4M22 8.8a15 15 0 0 0-10-3.8M2 2l20 20" />
  </Icon>
);

export const AlertIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3zM12 9v4M12 17h.01" />
  </Icon>
);

export const CameraIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </Icon>
);

export const KeypadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
  </Icon>
);

export const IdCardIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <path d="M14 10h4M14 14h4M5.5 16a3 3 0 0 1 5 0" />
  </Icon>
);
