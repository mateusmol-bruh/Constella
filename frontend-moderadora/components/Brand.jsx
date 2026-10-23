import Image from 'next/image';
export default function Brand() {
  return <Image src="/constella-logo.png" alt="Constella" width={179} height={52} className="brand" priority />;
}
