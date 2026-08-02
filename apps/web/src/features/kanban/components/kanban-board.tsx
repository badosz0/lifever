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
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";

import {
  KanbanCardSurface,
} from "@/features/kanban/components/kanban-card";
import type { CollaborationPeer } from "@/features/collaboration/model/types";
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
  const isCardCollision = (id: string | number) =>
    id !== args.active.id && containerFor(id)?.data.current?.type === "card";

  const preferCardInColumn = (
    collisions: ReturnType<typeof pointerWithin>,
  ) => {
    const eligibleCollisions = collisions.filter(
      ({ id }) => id !== args.active.id,
    );
    const cardCollisions = eligibleCollisions.filter(({ id }) =>
      isCardCollision(id),
    );
    if (cardCollisions.length > 0) return cardCollisions;

    const columnCollision = eligibleCollisions.find(
      ({ id }) => containerFor(id)?.data.current?.type === "column",
    );
    if (!columnCollision) return eligibleCollisions;

    const columnId = containerFor(columnCollision.id)?.data.current?.columnId;
    const columnCards = args.droppableContainers.filter(
      (container) =>
        container.id !== args.active.id &&
        container.data.current?.type === "card" &&
        container.data.current?.columnId === columnId,
    );
    const closestCard = closestCorners({
      ...args,
      droppableContainers: columnCards,
    });

    return closestCard.length > 0 ? closestCard : [columnCollision];
  };

  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const preferredPointerCollisions = preferCardInColumn(pointerCollisions);
    if (preferredPointerCollisions.length > 0) {
      return preferredPointerCollisions;
    }
  }
  const intersections = rectIntersection(args);
  if (intersections.length > 0) {
    const preferredIntersections = preferCardInColumn(intersections);
    if (preferredIntersections.length > 0) return preferredIntersections;
  }
  return preferCardInColumn(closestCorners(args));
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

  const getDestination = (
    event: DragOverEvent | DragEndEvent,
  ): { columnId: string; index: number } | null => {
    const over = event.over;
    if (!over) return null;
    const activeId = String(event.active.data.current?.cardId ?? "");
    const overData = over.data.current;
    if (overData?.type === "column") {
      const columnId = String(overData.columnId);
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
      const cardsInColumn = allCards
        .filter((card) => card.columnId === overCard.columnId)
        .sort((a, b) => a.position - b.position);
      const destinationCards = allCards
        .filter(
          (card) =>
            card.columnId === overCard.columnId && card.id !== activeId,
        )
        .sort((a, b) => a.position - b.position);
      if (overCardId === activeId) {
        const currentIndex = cardsInColumn.findIndex(
          (card) => card.id === activeId,
        );
        return {
          columnId: overCard.columnId,
          index: Math.max(0, Math.min(currentIndex, destinationCards.length)),
        };
      }
      const overIndex = destinationCards.findIndex(
        (card) => card.id === overCardId,
      );
      if (overIndex < 0) return null;
      const activeRect =
        event.active.rect.current.translated ??
        event.active.rect.current.initial;
      const activeCenter = activeRect
        ? activeRect.top + activeRect.height / 2
        : over.rect.top + over.rect.height / 2;
      const goesAfter = activeCenter > over.rect.top + over.rect.height / 2;
      return {
        columnId: overCard.columnId,
        index: Math.max(
          0,
          Math.min(
            overIndex + (goesAfter ? 1 : 0),
            destinationCards.length,
          ),
        ),
      };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (readOnly) return;
    const cardId = event.active.data.current?.cardId;
    if (typeof cardId === "string") {
      setActiveCardId(cardId);
      setCollaborationFocusCardId(cardId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (readOnly) return;
    const cardId = event.active.data.current?.cardId;
    if (typeof cardId !== "string") return;
    const card = allCards.find((item) => item.id === cardId);
    const destination = getDestination(event);
    if (!card || !destination || card.columnId === destination.columnId) return;
    moveCard(card.id, destination.columnId, destination.index);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const cardId = event.active.data.current?.cardId;
    const destination = getDestination(event);
    setActiveCardId(null);
    setCollaborationFocusCardId(null);
    if (typeof cardId !== "string" || !destination) return;
    moveCard(cardId, destination.columnId, destination.index);
  };

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
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setActiveCardId(null);
        setCollaborationFocusCardId(null);
      }}
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
