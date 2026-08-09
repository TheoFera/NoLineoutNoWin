import type Phaser from "phaser";

export function fitTextToWidth(
  textObject: Phaser.GameObjects.Text,
  maximumWidth: number,
  minimumFontSize: number
): Phaser.GameObjects.Text {
  let fontSize = Number.parseInt(String(textObject.style.fontSize), 10);

  while (textObject.width > maximumWidth && fontSize > minimumFontSize) {
    fontSize -= 1;
    textObject.setFontSize(fontSize);
  }

  if (textObject.width <= maximumWidth) {
    return textObject;
  }

  const fullText = textObject.text;
  let minimumLength = 0;
  let maximumLength = fullText.length;

  while (minimumLength < maximumLength) {
    const testedLength = Math.ceil((minimumLength + maximumLength) / 2);
    textObject.setText(`${fullText.slice(0, testedLength).trimEnd()}…`);
    if (textObject.width <= maximumWidth) {
      minimumLength = testedLength;
    } else {
      maximumLength = testedLength - 1;
    }
  }

  textObject.setText(`${fullText.slice(0, minimumLength).trimEnd()}…`);
  return textObject;
}
