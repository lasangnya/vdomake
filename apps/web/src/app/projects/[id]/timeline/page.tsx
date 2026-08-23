import { redirect } from 'next/navigation';

export default function ProjectTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect('/projects');
}
