type ScrollContainer = {
  contains: (target: Node) => boolean;
};

export function shouldIgnoreMentionMenuScroll(
  target: EventTarget | null,
  menu: ScrollContainer | null,
) {
  return Boolean(target && menu?.contains(target as Node));
}
