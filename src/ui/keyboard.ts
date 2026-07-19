export function bindPressable(element: HTMLElement, action: () => void): void {
  element.addEventListener("click", action);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  });
}
