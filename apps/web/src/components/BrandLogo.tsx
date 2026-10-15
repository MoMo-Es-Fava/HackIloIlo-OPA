import Image from "next/image";

export default function BrandLogo({ size }: { size: number }) {
  return (
    <span className="brand-logo" aria-hidden="true" style={{ width: size, height: size }}>
      <Image
        src="/images/irpc-logo.png"
        alt=""
        width={size}
        height={size}
        className="block h-full w-full object-cover"
      />
    </span>
  );
}
