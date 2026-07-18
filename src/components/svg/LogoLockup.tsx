import type { SVGProps } from 'react';

// Full Keystone Analytics lockup: arch mark + "KEYSTONE" wordmark + "ANALYTICS".
// The arch and "ANALYTICS" use the brand green (#9dbe3c); the "KEYSTONE" wordmark
// uses currentColor so it stays legible in both light and dark themes (the brand
// source art is ink #0e0e0e, which would be invisible on the app's dark surfaces).
// Fonts reference the next/font CSS variables so the live <text> renders in the
// brand faces rather than a generic fallback.
const GREEN = '#9dbe3c';

const LogoLockup = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 562.31915 490.06958"
    role="img"
    aria-label="Keystone Analytics"
    {...props}
  >
    <g transform="matrix(1.2515296,0,0,1.2515296,153.52442,0)">
      <path
        fill={GREEN}
        fillRule="evenodd"
        d="m 0,100 a 100,100 0 0 1 200,0 v 122 a 5,5 0 0 1 -5,5 H 5 A 5,5 0 0 1 0,222 Z M 41,227 V 99 a 59,59 0 0 1 118,0 v 128 z"
      />
      <path fill={GREEN} d="m 85,227 v -71 a 15,15 0 0 1 30,0 v 71 z" />
    </g>
    <text
      x="282.11646"
      y="427.64331"
      textAnchor="middle"
      fontWeight="700"
      fontSize="95.6964px"
      letterSpacing="3.2"
      fill="currentColor"
      style={{ fontFamily: 'var(--font-spectral), serif' }}
    >
      KEYSTONE
    </text>
    <text
      x="286.52682"
      y="489.3345"
      textAnchor="middle"
      fontWeight="600"
      fontSize="52.506px"
      letterSpacing="13"
      fill={GREEN}
      style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
    >
      <tspan x="293.02682" y="489.3345">
        ANALYTICS
      </tspan>
    </text>
  </svg>
);

export default LogoLockup;
