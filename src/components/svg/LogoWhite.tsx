import type { SVGProps } from 'react';

const SvgLogoWhite = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 200 227"
    {...props}
  >
    <path
      fill="#fff"
      fillRule="evenodd"
      d="M0 100a100 100 0 0 1 200 0v122a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5Zm41 127V99a59 59 0 0 1 118 0v128Z"
    />
    <path fill="#fff" d="M85 227v-71a15 15 0 0 1 30 0v71Z" />
  </svg>
);
export default SvgLogoWhite;
