import { redirect } from 'next/navigation';

export default function ProjectGeneratePage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect('/projects');
}
