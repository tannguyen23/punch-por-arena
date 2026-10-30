import { scene } from '../core/scene.js';
import { box, part, colorMaterial } from '../core/meshes.js';
import { TABLE_BOARD } from '../config.js';

function createMark(parent, side, cellSize) {
  const root = new BABYLON.TransformNode('tableMark', scene);
  root.parent = parent;
  const material = colorMaterial(side === 0 ? TABLE_BOARD.colors.x : TABLE_BOARD.colors.o);
  const size = TABLE_BOARD.markSize * cellSize;
  if (side === 0) {
    for (const angle of [-Math.PI / 4, Math.PI / 4]) {
      const stroke = part(box(size, TABLE_BOARD.thickness, TABLE_BOARD.markWidth), root, 0, 0, 0, material);
      stroke.rotation.y = angle;
    }
  } else {
    const ring = BABYLON.MeshBuilder.CreateTorus('tableO', {
      diameter: size, thickness: TABLE_BOARD.markWidth, tessellation: TABLE_BOARD.ringSegments,
    }, scene);
    part(ring, root, 0, 0, 0, material);
  }
  return root;
}

function buildCells(root, size) {
  const cellSize = 1 / size;
  const grid = colorMaterial(TABLE_BOARD.colors.grid);
  for (let i = 1; i < size; i++) {
    const offset = i * cellSize - 0.5;
    part(box(TABLE_BOARD.gridWidth, TABLE_BOARD.thickness, 1), root, offset, TABLE_BOARD.thickness, 0, grid);
    part(box(1, TABLE_BOARD.thickness, TABLE_BOARD.gridWidth), root, 0, TABLE_BOARD.thickness, offset, grid);
  }
  return Array.from({ length: size ** 2 }, (_, cell) => [0, 1].map((side) => {
    const mark = createMark(root, side, cellSize);
    mark.position.set((cell % size + 0.5) * cellSize - 0.5, TABLE_BOARD.markWidth,
      (Math.floor(cell / size) + 0.5) * cellSize - 0.5);
    return mark;
  }));
}

export function createTableBoard(surface) {
  const bounds = surface.getBoundingInfo().boundingBox;
  const width = Math.min(bounds.maximum.x - bounds.minimum.x, bounds.maximum.z - bounds.minimum.z)
    * (1 - TABLE_BOARD.inset * 2);
  const root = new BABYLON.TransformNode('tableBoard', scene);
  root.parent = surface;
  root.position.set(bounds.center.x, bounds.maximum.y + TABLE_BOARD.lift, bounds.center.z);
  root.scaling.setAll(width);
  root.setEnabled(false);
  let cells = [];
  let size = 0;
  return {
    update(game) {
      root.setEnabled(Boolean(game));
      if (!game) return;
      const nextSize = Math.sqrt(game.board.length);
      if (size !== nextSize) {
        root.getChildren().forEach((node) => node.dispose());
        part(box(1, TABLE_BOARD.thickness, 1), root, 0, 0, 0, colorMaterial(TABLE_BOARD.colors.background));
        size = nextSize;
        cells = buildCells(root, size);
      }
      cells.forEach((marks, cell) => marks.forEach((mark, side) => {
        mark.setEnabled(game.board[cell] === side);
        const material = colorMaterial(game.line.includes(cell) ? TABLE_BOARD.colors.win
          : side === 0 ? TABLE_BOARD.colors.x : TABLE_BOARD.colors.o);
        mark.getChildMeshes().forEach((mesh) => { mesh.material = material; });
      }));
    },
  };
}
