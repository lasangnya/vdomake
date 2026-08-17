import { redirect } from 'next/navigation';

export default function ProjectStoryboardPage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect('/projects');
}
