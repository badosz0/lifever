import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CollaborationPeer } from "@/features/collaboration/model/types";
import {
  KanbanCardSurface,
} from "@/features/kanban/components/kanban-card";
import { KanbanColumn } from "@/features/kanban/components/kanban-column";
import { useKanban } from "@/features/kanban/model/kanban-provider";
import type {
  KanbanCard,
  KanbanColumn as KanbanColumnModel,
  KanbanLabel,
} from "@/features/kanban/model/types";

type KanbanBoardProps = {
  columns: KanbanColumnModel[];
  cards: KanbanCard[];
  allCards: KanbanCard[];
  labels: KanbanLabel[];
  cardCollaborators: Record<string, CollaborationPeer[]>;
  onAddCard: (columnId: string) => void;
  onManageWorkflow: () => void;
  readOnly?: boolean;
};

const collisionDetection: CollisionDetection = (args) => {
  const containerFor = (id: string | number) =>
    args.droppableContainers.find((container) => container.id === id);

  const resolveColumnPlacement = (
    collisions: ReturnType<typeof pointerWithin>,
  ) => {
    const columnCollision = collisions.find(
      ({ id }) => containerFor(id)?.data.current?.columnId,
    );
    if (!columnCollision) return collisions;

    const columnId = String(
      containerFor(columnCollision.id)?.data.current?.columnId,
    );
    const columnCards = args.droppableContainers.filter(
      (container) =>
        container.data.current?.type === "card" &&
        container.data.current?.columnId === columnId,
    ).sort((a, b) => {
      const aIndex = a.data.current?.sortable?.index;
      const bIndex = b.data.current?.sortable?.index;
      return typeof aIndex === "number" && typeof bIndex === "number"
        ? aIndex - bIndex
        : 0;
    });

    const columnContainer = args.droppableContainers.find(
      (container) =>
        container.data.current?.type === "column" &&
        container.data.current?.columnId === columnId,
    );
    if (columnCards.length === 0) {
      return columnContainer
        ? [{ id: columnContainer.id }]
        : [columnCollision];
    }

    // A grab point can still be inside the card above while most of the
    // dragged card is already below it. Rank the insertion slot from the
    // dragged card's visual center so the preview matches the eventual drop.
    const draggedCenter =
      args.collisionRect.top + args.collisionRect.height / 2;
    const otherCards = columnCards.filter(
      (container) => container.id !== args.active.id,
    );
    let destinationIndex = 0;
    for (const container of otherCards) {
      const rect = args.droppableRects.get(container.id);
      if (!rect) continue;
      if (draggedCenter <= rect.top + rect.height / 2) break;
      destinationIndex += 1;
    }

    const sourceColumnId = String(args.active.data.current?.columnId ?? "");
    if (sourceColumnId === columnId) {
      // Including the active container maps a no-op back to its original slot,
      // while dnd-kit's sortable preview receives the exact destination index.
      const target = columnCards[destinationIndex];
      return target ? [{ id: target.id }] : [columnCollision];
    }

    const target = columnCards[destinationIndex];
    if (target) return [{ id: target.id }];
    return columnContainer ? [{ id: columnContainer.id }] : [columnCollision];
  };

  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const preferredPointerCollisions =
      resolveColumnPlacement(pointerCollisions);
    if (preferredPointerCollisions.length > 0) {
      return preferredPointerCollisions;
    }
  }
  const intersections = rectIntersection(args);
  if (intersections.length > 0) {
    const preferredIntersections = resolveColumnPlacement(intersections);
    if (preferredIntersections.length > 0) return preferredIntersections;
  }
  return resolveColumnPlacement(closestCorners(args));
};

export function KanbanBoard({
  columns,
  cards,
  allCards,
  labels,
  cardCollaborators,
  onAddCard,
  onManageWorkflow,
  readOnly = false,
}: KanbanBoardProps) {
  const {
    moveCard,
    selectedCardId,
    setCollaborationFocusCardId,
    setSelectedCardId,
  } = useKanban();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const activeCardIdRef = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 7 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columnById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );
  const activeCard =
    allCards.find((card) => card.id === activeCardId) ?? null;
  const activeColumn = activeCard
    ? columnById.get(activeCard.columnId)
    : undefined;

  const clearDrag = useCallback(() => {
    activeCardIdRef.current = null;
    setActiveCardId(null);
    setCollaborationFocusCardId(null);
  }, [setCollaborationFocusCardId]);

  useEffect(() => {
    if (
      activeCardId &&
      (!allCards.some((card) => card.id === activeCardId) || readOnly)
    ) {
      clearDrag();
    }
  }, [activeCardId, allCards, clearDrag, readOnly]);

  const getDestination = (
    event: DragEndEvent,
    activeId: string,
  ): { columnId: string; index: number } | null => {
    const over = event.over;
    if (!over) return null;
    const overData = over.data.current;
    if (overData?.type === "column") {
      const columnId = String(overData.columnId);
      if (!columnById.has(columnId)) return null;
      return {
        columnId,
        index: allCards.filter(
          (card) => card.columnId === columnId && card.id !== activeId,
        ).length,
      };
    }
    if (overData?.type === "card") {
      const overCardId = String(overData.cardId);
      const overCard = allCards.find((card) => card.id === overCardId);
      if (!overCard) return null;
      const activeCard = allCards.find((card) => card.id === activeId);
      if (overCardId === activeId) return null;

      const columnCards = allCards
        .filter(
          (card) => card.columnId === overCard.columnId,
        )
        .sort((a, b) => a.position - b.position);
      const overIndex = columnCards.findIndex(
        (card) => card.id === overCardId,
      );
      if (overIndex < 0) return null;

      // Collision detection already maps the dragged card's visual center to
      // an exact sortable slot. Commit that slot directly instead of measuring
      // a sibling that may currently be transformed by the preview animation.
      const destinationIndex =
        activeCard?.columnId === overCard.columnId
          ? overIndex
          : columnCards.filter((card) => card.id !== activeId).findIndex(
              (card) => card.id === overCardId,
            );
      if (destinationIndex < 0) return null;
      return {
        columnId: overCard.columnId,
        index: destinationIndex,
      };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (readOnly) return;
    const cardId = event.active.data.current?.cardId;
    if (
      typeof cardId !== "string" ||
      !allCards.some((card) => card.id === cardId)
    ) {
      return;
    }
    activeCardIdRef.current = cardId;
    setActiveCardId(cardId);
    setCollaborationFocusCardId(cardId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const cardId = activeCardIdRef.current;
    const destination = cardId ? getDestination(event, cardId) : null;
    clearDrag();
    if (!cardId || !destination) return;
    moveCard(cardId, destination.columnId, destination.index);
  };

  // Keep the active sortable mounted in its original column until drop.
  // Reparenting it from onDragOver makes dnd-kit's useRect layout effect
  // repeatedly remeasure the reconnected node and can trigger React error 185.

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      autoScroll={{
        acceleration: 18,
        interval: 5,
        threshold: { x: 0.16, y: 0.18 },
      }}
      onDragStart={handleDragStart}
      onDragCancel={clearDrag}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-full min-w-max items-start gap-4 px-4 pb-8 sm:px-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={cards
              .filter((card) => card.columnId === column.id)
              .sort((a, b) => a.position - b.position)}
            totalCardCount={
              allCards.filter((card) => card.columnId === column.id).length
            }
            labels={labels}
            cardCollaborators={cardCollaborators}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            onAddCard={onAddCard}
            onManageWorkflow={onManageWorkflow}
            readOnly={readOnly}
          />
        ))}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 190,
          easing: "cubic-bezier(.23,1,.32,1)",
        }}
      >
        {activeCard ? (
          <div className="w-[272px]">
            <KanbanCardSurface
              card={activeCard}
              labels={labels}
              completed={Boolean(activeColumn?.isDone)}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
