import Image from 'next/image';
export default function Brand() {
  return (
    <Image
      src="/constella-logo.svg"
      alt="Constella"
      width={213}
      height={63}
      className="brand"
      priority
    />
  );
}
