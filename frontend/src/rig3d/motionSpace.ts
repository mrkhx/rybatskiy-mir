import { Matrix4, Object3D, Vector3 } from "three";

/** Runs approved standalone motion in the embedding fisherman's frame.
 * Stored points remain world-space; approved samplers and assets are unchanged.
 */
export class MotionSpace {
  private matrix = new Matrix4();
  private inverse = new Matrix4();
  private previous: Matrix4 | null = null;
  private change = new Matrix4();
  private a = new Vector3();
  private b = new Vector3();
  private c = new Vector3();

  constructor(private frame: Object3D | null = null, private waterY = 0) {}

  private update() {
    if (!this.frame) return;
    this.frame.updateWorldMatrix(true, false);
    this.matrix.copy(this.frame.matrixWorld);
    // Approved samplers use y=0 as their water surface.
    this.matrix.elements[13] = this.waterY;
    this.inverse.copy(this.matrix).invert();
  }

  point<T>(fn: (start: Vector3, param: T, out: Vector3) => Vector3, start: Vector3, param: T, out: Vector3) {
    if (!this.frame) return fn(start, param, out);
    this.update();
    fn(this.a.copy(start).applyMatrix4(this.inverse), param, out);
    return out.applyMatrix4(this.matrix);
  }

  pair(fn: (start: Vector3, fish: Vector3, t: number, out: Vector3) => Vector3,
    start: Vector3, fish: Vector3, t: number, out: Vector3) {
    if (!this.frame) return fn(start, fish, t, out);
    this.update();
    fn(this.a.copy(start).applyMatrix4(this.inverse), this.b.copy(fish).applyMatrix4(this.inverse), t, out);
    return out.applyMatrix4(this.matrix);
  }

  leader(fn: (fish: Vector3, float: Vector3, detach: Vector3, t: number, out: Vector3) => Vector3,
    fish: Vector3, float: Vector3, detach: Vector3, t: number, out: Vector3) {
    if (!this.frame) return fn(fish, float, detach, t, out);
    this.update();
    fn(this.a.copy(fish).applyMatrix4(this.inverse), this.b.copy(float).applyMatrix4(this.inverse),
      this.c.copy(detach).applyMatrix4(this.inverse), t, out);
    return out.applyMatrix4(this.matrix);
  }

  /** Rebase cached world positions once after placement changes (zero is the rig's unarmed sentinel). */
  rebase(points: readonly Vector3[]) {
    if (!this.frame) return;
    this.update();
    if (this.previous && !this.previous.equals(this.matrix)) {
      this.change.copy(this.previous).invert().premultiply(this.matrix);
      for (const point of points) if (point.lengthSq() > 0) point.applyMatrix4(this.change);
    }
    if (!this.previous) this.previous = this.matrix.clone();
    else this.previous.copy(this.matrix);
  }

  surface(rest: Vector3, x: number, y: number, z: number, out: Vector3) {
    this.offset(x, y, z, this.b);
    out.copy(rest);
    out.y = this.frame ? this.waterY : 0;
    return out.add(this.b);
  }

  /** Direction/offset, without adding the character translation. */
  offset(x: number, y: number, z: number, out: Vector3) {
    out.set(x, y, z);
    if (!this.frame) return out;
    this.update();
    this.a.set(0, 0, 0).applyMatrix4(this.matrix);
    return out.applyMatrix4(this.matrix).sub(this.a);
  }
}
