'use client';

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Scene } from '@/types/scene';
import { SceneCard } from './scene-card';

function SortableSceneCard({
  scene,
  screenshotUrl,
  onEdit,
  onDelete,
}: {
  scene: Scene;
  screenshotUrl?: string;
  onEdit?: (scene: Scene) => void;
  onDelete?: (sceneId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'relative z-10 opacity-80' : ''}
    >
      <SceneCard
        scene={scene}
        screenshotUrl={screenshotUrl}
        onEdit={onEdit}
        onDelete={onDelete}
        className={isDragging ? 'ring-2 ring-violet-500' : ''}
      />
    </div>
  );
}

export function StoryboardGrid({
  scenes,
  screenshotUrls,
  onReorder,
  onEdit,
  onDelete,
  className,
}: {
  scenes: Scene[];
  screenshotUrls?: Record<string, string>;
  onReorder?: (scenes: Scene[]) => void;
  onEdit?: (scene: Scene) => void;
  onDelete?: (sceneId: string) => void;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(scenes, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
    onReorder?.(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className={className ?? 'grid grid-cols-2 gap-4 lg:grid-cols-3'}>
          {scenes.map((scene) => (
            <SortableSceneCard
              key={scene.id}
              scene={scene}
              screenshotUrl={screenshotUrls?.[scene.screenshotId]}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
