export type TitleSegment = {
  id: string;
  text: string;
  color: string;
};

export function createTitleSegment(
  text = "NEW TEXT",
  color = "#ffffff",
): TitleSegment {
  return {
    id: crypto.randomUUID(),
    text,
    color,
  };
}

export function createDefaultTitleSegments(): TitleSegment[] {
  return [
    createTitleSegment("RANKING ", "#a78bfa"),
    createTitleSegment("THE BEST MOMENTS", "#ffffff"),
  ];
}
