// 设置面板显示/隐藏控制
document.querySelector(".toggle-controls").addEventListener("click", () => {
  document.getElementById("controls").classList.toggle("show");
});

// 触摸控制面板时阻止滑动事件传播
document.getElementById("controls").addEventListener(
  "touchmove",
  (e) => {
    e.stopPropagation();
  },
  { passive: false }
);

function getGameConfig() {
  // 获取屏幕尺寸
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    type: Phaser.AUTO,
    width: width,
    height: height,
    backgroundColor: "#333333",
    scene: MainScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: {
      min: 30, // 最小帧率
      target: 60, // 目标帧率
      limit: 1,
      max: 60, // 最大帧率
      forceSetTimeOut: true,
    },
  };
}
const gameControls = {
  jumpSpeed: 0.15,
  jumpHeight: 4,
  moveSpeed: 1,
  breathSpeed: 0.05,
  breathScale: 0.2,
  cohesionForce: 0.02,
  separationForce: 0,
  alignmentForce: 0.1,
  visionRange: 200,
};
class Soldier extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height, color) {
    super(scene, x, y, width, height, color);
    this.selected = false;
    this.baseX = x;
    this.baseY = y;
    this.angle = Math.random() * Math.PI * 2;
    this.radius = 50;
    this.moving = false;
    this.targetX = x;
    this.targetY = y;
    this.jumpPhase = Math.random() * Math.PI * 2;
    this.breathPhase = Math.random() * Math.PI * 2;
    this.baseScale = 1;
    this.setOrigin(0.5, 0.5);
    this.velocityX = 0;
    this.velocityY = 0;
  }

  get jumpSpeed() {
    return gameControls.jumpSpeed;
  }
  get jumpHeight() {
    return gameControls.jumpHeight;
  }
  get moveSpeed() {
    return gameControls.moveSpeed;
  }
  get breathSpeed() {
    return gameControls.breathSpeed;
  }
  get breathScale() {
    return gameControls.breathScale;
  }
  get cohesionForce() {
    return gameControls.cohesionForce;
  }
  get separationForce() {
    return gameControls.separationForce;
  }
  get alignmentForce() {
    return gameControls.alignmentForce;
  }
  get visionRange() {
    return gameControls.visionRange;
  }

  updateBreathing() {
    this.breathPhase += this.breathSpeed;
    const breathFactor = Math.sin(this.breathPhase) * this.breathScale;
    const newScale = this.baseScale + breathFactor;
    this.setScale(newScale);
  }

  calculateFlockingBehavior(neighbors) {
    let cohesionX = 0,
      cohesionY = 0;
    let separationX = 0,
      separationY = 0;
    let alignmentX = 0,
      alignmentY = 0;
    let nearbyCount = 0;

    neighbors.forEach((other) => {
      if (other !== this && other.moving && other.selected === this.selected) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.visionRange && distance > 0) {
          // Cohesion
          cohesionX += other.x;
          cohesionY += other.y;

          // Separation
          const separationFactor = 1 / distance;
          separationX -= dx * separationFactor;
          separationY -= dy * separationFactor;

          // Alignment
          alignmentX += other.velocityX;
          alignmentY += other.velocityY;

          nearbyCount++;
        }
      }
    });

    if (nearbyCount > 0) {
      // Calculate cohesion force
      cohesionX = (cohesionX / nearbyCount - this.x) * this.cohesionForce;
      cohesionY = (cohesionY / nearbyCount - this.y) * this.cohesionForce;

      // Calculate alignment force
      alignmentX = (alignmentX / nearbyCount) * this.alignmentForce;
      alignmentY = (alignmentY / nearbyCount) * this.alignmentForce;
    }

    // Apply separation force
    separationX *= this.separationForce;
    separationY *= this.separationForce;

    return {
      x: cohesionX + separationX + alignmentX,
      y: cohesionY + separationY + alignmentY,
    };
  }

  update(neighbors) {
    this.updateBreathing();

    if (this.moving) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        const normalizedDx = (dx / distance) * this.moveSpeed;
        const normalizedDy = (dy / distance) * this.moveSpeed;

        const flocking = this.calculateFlockingBehavior(neighbors);

        this.velocityX = normalizedDx + flocking.x;
        this.velocityY = normalizedDy + flocking.y;

        // 限制最大速度
        const currentSpeed = Math.sqrt(
          this.velocityX * this.velocityX + this.velocityY * this.velocityY
        );
        if (currentSpeed > this.moveSpeed) {
          this.velocityX = (this.velocityX / currentSpeed) * this.moveSpeed;
          this.velocityY = (this.velocityY / currentSpeed) * this.moveSpeed;
        }

        this.x += this.velocityX;
        this.y += this.velocityY;

        this.jumpPhase += this.jumpSpeed;
        const jumpOffset = Math.sin(this.jumpPhase) * this.jumpHeight;
        this.y +=
          jumpOffset -
          Math.sin(this.jumpPhase - this.jumpSpeed) * this.jumpHeight;
      } else {
        this.x = this.targetX;
        this.y = this.targetY;
        this.velocityX = 0;
        this.velocityY = 0;
      }
    } else {
      this.angle += 0.02;
      this.jumpPhase += this.jumpSpeed;
      const basePosition = {
        x: this.baseX + Math.cos(this.angle) * this.radius,
        y: this.baseY + Math.sin(this.angle) * this.radius,
      };
      this.x = basePosition.x;
      this.y = basePosition.y + Math.sin(this.jumpPhase) * this.jumpHeight;
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  moveTo(x, y) {
    this.moving = true;
    this.targetX = x;
    this.targetY = y;
  }
}
class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.ver = "v0.0.1";
    this.soldiers = [];
    this.selectionRect = null;
    this.startPoint = null;
    this.enemyBase = null;
    this.playerBase = null;
    this.enemyHP = 100;
    this.isSelecting = false;
    this.MAX_SOLDIERS = 20;
    this.waitingForMove = false;
    this.BASE_RADIUS = 30;
  }

  create() {
    [
      "jumpSpeed",
      "jumpHeight",
      "moveSpeed",
      "breathSpeed",
      "breathScale",
      "cohesionForce",
      "separationForce",
      "alignmentForce",
      "visionRange",
    ].forEach((controlId) => {
      const control = document.getElementById(controlId);
      const valueDisplay = document.getElementById(`${controlId}Value`);
      control.addEventListener("input", (e) => {
        const newValue = parseFloat(e.target.value);
        valueDisplay.textContent = newValue.toFixed(3);
        gameControls[controlId] = newValue;
      });
    });

    this.add.text(10, 50, this.ver, {
      fontSize: "16px",
      fill: "#fff",
      backgroundColor: "#000",
    });

    this.fpsText = this.add.text(10, 80, `FPS: 0`, {
      fontSize: "16px",
      fill: "#fff",
      backgroundColor: "#000",
    });

    // 定时更新帧率
    this.lastUpdateTime = 0;
    this.frameCount = 0;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const gap = 50 + this.BASE_RADIUS;
    const baseWidth = width / 2;
    this.playerBase = this.add.circle(
      baseWidth,
      gap,
      this.BASE_RADIUS,
      0x0000ff
    );
    this.enemyBase = this.add.circle(
      baseWidth,
      height - gap,
      this.BASE_RADIUS,
      0xff0000
    );

    const textGap = gap - 10;

    this.enemyHPText = this.add.text(
      this.enemyBase.x,
      this.enemyBase.y + textGap - 20,
      "HP: 100",
      {
        fontSize: "16px",
        fill: "#ff0000",
      }
    );

    this.enemyHPText.setOrigin(0.5, 0.5);

    this.soldierCountText = this.add.text(
      this.playerBase.x,
      this.playerBase.y - textGap,
      "Soldiers: 0/20",
      {
        fontSize: "16px",
        fill: "#ffffff",
      }
    );

    this.soldierCountText.setOrigin(0.5, 0.5);

    this.time.addEvent({
      delay: 3000,
      callback: this.createSoldier,
      callbackScope: this,
      loop: true,
    });

    this.setupInputHandlers();
  }

  setupInputHandlers() {
    this.input.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown()) {
        this.soldiers.forEach((soldier) => {
          soldier.selected = false;
          soldier.setFillStyle(0xffffff);
        });
        this.waitingForMove = false;
      } else {
        if (this.waitingForMove) {
          this.moveSelectedSoldiers(pointer.x, pointer.y);
          this.waitingForMove = false;
        } else {
          if (!pointer.event.shiftKey) {
            this.soldiers.forEach((soldier) => {
              soldier.selected = false;
              soldier.setFillStyle(0xffffff);
            });
          }

          this.isSelecting = true;
          this.startPoint = { x: pointer.x, y: pointer.y };

          if (this.selectionRect) {
            this.selectionRect.destroy();
          }
          this.selectionRect = this.add.rectangle(
            this.startPoint.x,
            this.startPoint.y,
            0,
            0,
            0x00ff00,
            0.3
          );
          this.selectionRect.setOrigin(0, 0);
        }
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (this.isSelecting && this.startPoint && this.selectionRect) {
        const width = pointer.x - this.startPoint.x;
        const height = pointer.y - this.startPoint.y;

        this.selectionRect.setSize(width, height);

        const bounds = this.selectionRect.getBounds();
        this.soldiers.forEach((soldier) => {
          if (Phaser.Geom.Rectangle.Contains(bounds, soldier.x, soldier.y)) {
            soldier.selected = true;
            soldier.setFillStyle(0x00ff00);
          } else if (!pointer.event.shiftKey) {
            soldier.selected = false;
            soldier.setFillStyle(0xffffff);
          }
        });
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (this.isSelecting) {
        if (this.selectionRect) {
          const bounds = this.selectionRect.getBounds();
          this.soldiers.forEach((soldier) => {
            if (Phaser.Geom.Rectangle.Contains(bounds, soldier.x, soldier.y)) {
              soldier.selected = true;
              soldier.setFillStyle(0x00ff00);
            }
          });

          this.selectionRect.destroy();
          this.selectionRect = null;
        }

        const selectedSoldiers = this.soldiers.filter((s) => s.selected);
        if (selectedSoldiers.length > 0) {
          this.waitingForMove = true;
        }

        this.startPoint = null;
        this.isSelecting = false;
      }
    });
  }

  createSoldier() {
    if (this.soldiers.length >= this.MAX_SOLDIERS) return;

    const soldier = new Soldier(
      this,
      this.playerBase.x,
      this.playerBase.y,
      10,
      10,
      0xffffff
    );
    this.add.existing(soldier);
    this.soldiers.push(soldier);
    this.updateSoldierCount();
  }

  updateSoldierCount() {
    this.soldierCountText.setText(
      `Soldiers: ${this.soldiers.length}/${this.MAX_SOLDIERS}`
    );
  }

  moveSelectedSoldiers(targetX, targetY) {
    const selectedSoldiers = this.soldiers.filter((s) => s.selected);
    if (selectedSoldiers.length === 0) return;

    const distanceToBase = Phaser.Math.Distance.Between(
      targetX,
      targetY,
      this.enemyBase.x,
      this.enemyBase.y
    );

    if (distanceToBase <= 50) {
      const angleStep = (Math.PI * 2) / selectedSoldiers.length;
      selectedSoldiers.forEach((soldier, index) => {
        const angle = angleStep * index;
        const radius = this.BASE_RADIUS - 1;
        const targetPosX = this.enemyBase.x + Math.cos(angle) * radius;
        const targetPosY = this.enemyBase.y + Math.sin(angle) * radius;

        soldier.moveTo(targetPosX, targetPosY);
      });
    } else {
      const spacing = 20;
      const cols = Math.ceil(Math.sqrt(selectedSoldiers.length));

      selectedSoldiers.forEach((soldier, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const offsetX = (col - cols / 2) * spacing;
        const offsetY =
          (row - Math.floor(selectedSoldiers.length / cols) / 2) * spacing;

        soldier.moveTo(targetX + offsetX, targetY + offsetY);
      });
    }
  }

  update(time) {
    // 每一帧增加计数
    this.frameCount++;

    // 每秒更新一次帧率
    if (time - this.lastUpdateTime >= 1000) {
      this.fpsText.setText(`FPS: ${this.frameCount}`);
      this.frameCount = 0;
      this.lastUpdateTime = time;
    }

    this.soldiers.forEach((soldier) => {
      soldier.update(this.soldiers);

      if (soldier.moving) {
        const distanceToEnemy = Phaser.Math.Distance.Between(
          soldier.x,
          soldier.y,
          this.enemyBase.x,
          this.enemyBase.y
        );

        if (distanceToEnemy <= this.BASE_RADIUS) {
          const dx = soldier.targetX - soldier.x;
          const dy = soldier.targetY - soldier.y;
          const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

          if (distanceToTarget <= 2) {
            this.enemyHP -= 1;
            this.enemyHPText.setText(`HP: ${this.enemyHP}`);

            const index = this.soldiers.indexOf(soldier);
            if (index > -1) {
              this.soldiers.splice(index, 1);
              soldier.destroy();
              this.updateSoldierCount();
            }
          }
        }
      }
    });

    if (this.enemyHP <= 0) {
      this.add
        .text(400, 300, "Victory!", {
          fontSize: "32px",
          fill: "#00ff00",
        })
        .setOrigin(0.5);
      this.scene.pause();
    }
  }
}

// 初始化游戏
const game = new Phaser.Game(getGameConfig());

// 监听窗口大小变化
window.addEventListener("resize", () => {
  game.scale.resize(getGameConfig().width, getGameConfig().height);
});
