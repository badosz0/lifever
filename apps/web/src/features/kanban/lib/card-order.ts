import type { KanbanCard } from "@/features/kanban/model/types";

const cardsInColumn = (cards: KanbanCard[], columnId: string) =>
  cards
    .map((card, sourceIndex) => ({ card, sourceIndex }))
    .filter(({ card }) => card.columnId === columnId)
    .sort(
      (left, right) =>
        left.card.position - right.card.position ||
        left.sourceIndex - right.sourceIndex,
    )
    .map(({ card }) => card);

/**
 * Produces a normalized card order for a drag preview or a committed move.
 * The input array is returned unchanged when the move has no effect.
 */
export function reorderKanbanCards(
  cards: KanbanCard[],
  cardId: string,
  columnId: string,
  destinationIndex: number,
) {
  const card = cards.find((item) => item.id === cardId);
  if (!card) return cards;

  const sourceCards = cardsInColumn(cards, card.columnId).filter(
    (item) => item.id !== cardId,
  );
  const destinationCards =
    card.columnId === columnId
      ? sourceCards
      : cardsInColumn(cards, columnId).filter((item) => item.id !== cardId);
  const requestedIndex = Number.isFinite(destinationIndex)
    ? Math.trunc(destinationIndex)
    : destinationCards.length;
  const boundedIndex = Math.max(
    0,
    Math.min(requestedIndex, destinationCards.length),
  );
  const reorderedDestination = [...destinationCards];
  reorderedDestination.splice(boundedIndex, 0, { ...card, columnId });

  const destinationPositions = new Map(
    reorderedDestination.map((item, index) => [item.id, index]),
  );
  const sourcePositions =
    card.columnId === columnId
      ? new Map<string, number>()
      : new Map(sourceCards.map((item, index) => [item.id, index]));
  let changed = false;
  const nextCards = cards.map((item) => {
    const nextDestinationPosition = destinationPositions.get(item.id);
    if (nextDestinationPosition !== undefined) {
      if (
        item.columnId === columnId &&
        item.position === nextDestinationPosition
      ) {
        return item;
      }
      changed = true;
      return {
        ...item,
        columnId,
        position: nextDestinationPosition,
      };
    }

    const nextSourcePosition = sourcePositions.get(item.id);
    if (
      nextSourcePosition === undefined ||
      item.position === nextSourcePosition
    ) {
      return item;
    }
    changed = true;
    return { ...item, position: nextSourcePosition };
  });

  return changed ? nextCards : cards;
}
