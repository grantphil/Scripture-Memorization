function randomizeDeckOrder() {
  if (!Array.isArray(passages) || passages.length < 2) return;

  const shuffled = [...passages];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.every((passage, index) => passage.id === passages[index].id)) {
    shuffled.push(shuffled.shift());
  }

  if (typeof elements !== 'undefined' && elements.searchBox) {
    elements.searchBox.value = '';
  }
  activeId = shuffled[0]?.id;
  revealed = studyMode === 'read';
  persist(shuffled);
}

document.addEventListener('click', (event) => {
  const shuffleButton = event.target.closest('[data-shuffle-deck]');
  if (!shuffleButton) return;
  randomizeDeckOrder();
});
