import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene";

export function createBattleGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 600,
    backgroundColor: "#0e1f29",
    scene: [BattleScene],
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });
}
