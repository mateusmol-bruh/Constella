'use client';
import { useParams } from 'next/navigation';
import ContentEditor from '@/components/ContentEditor';
export default function Page() {
  const { tipo, id } = useParams();
  return <ContentEditor tipo={tipo} id={id} />;
}
